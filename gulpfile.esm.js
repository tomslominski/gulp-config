import { src, dest, watch, series, parallel } from 'gulp';
import yargs from 'yargs';
import sass from 'gulp-sass';
import cleanCss from 'gulp-clean-css';
import gulpif from 'gulp-if';
import postcss from 'gulp-postcss';
import sourcemaps from 'gulp-sourcemaps';
import autoprefixer from 'autoprefixer';
import imagemin from 'gulp-imagemin';
import del from 'del';
import babel from 'gulp-babel';
import uglify from 'gulp-uglify';
import fiber from 'fibers';
import path from 'path';
import fs from 'fs';
import merge from '@ianwalter/merge';

sass.compiler = require('sass');

const PRODUCTION = yargs.argv.prod;
const ROOT = process.env.INIT_CWD;
const configFile = path.join(ROOT, 'gulp-config.json');
const configDirs = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile)) : {};
const defaultDirs = {
	assets: 'assets',
	styles: {
		input: ['src/sass/style.scss', 'src/sass/admin.scss'],
		output: 'assets/css',
		watch: 'src/sass/**/*.scss'
	},
	images: {
		input: 'src/images/**/*.{jpg,jpeg,png,svg,gif}',
		output: 'assets/images',
		watch: 'src/images/**/*.{jpg,jpeg,png,svg,gif}'
	},
	copy: {
		input: ['src/**/*', '!src/{images,js,sass}', '!src/{images,js,sass}/**/*'],
		output: 'assets',
		watch: ['src/**/*','!src/{images,js,scss}', '!src/{images,js,sass}/**/*']
	},
	scripts: {
		input: ['src/js/app.js', 'src/js/admin.js'],
		output: 'assets/js',
		watch: 'src/js/**/*.js'
	},
	icons: {
		input: 'src/icons/**/*.svg',
		output: 'assets/icons',
		watch: 'src/icons/**/*.svg'
	}
};
let dirs = merge(defaultDirs, configDirs);

const generateDirectories = (object) => {
	for (let key in object) {
		if (typeof object[key] === 'object') {
			generateDirectories(object[key]);
		} else {
			if( object[key].charAt(0) === '!' ) {
				object[key] = '!' + path.join(ROOT, object[key].slice(1));
			} else {
				object[key] = path.join(ROOT, object[key]);
			}
			
		}
	}
}

generateDirectories(dirs);

export const clean = () => del(dirs.assets, {force: true});

export const styles = () => {
	return src(dirs.styles.input, {allowEmpty: true})
	.pipe(gulpif(!PRODUCTION, sourcemaps.init()))
	.pipe(sass({fiber: fiber}).on('error', sass.logError))
	.pipe(postcss([ autoprefixer ]))
	.pipe(gulpif(PRODUCTION, cleanCss()))
	.pipe(gulpif(!PRODUCTION, sourcemaps.write('.')))
	.pipe(dest(dirs.styles.output));
}

export const images = () => {
	return src(dirs.images.input, {allowEmpty: true})
	.pipe(gulpif(PRODUCTION, imagemin()))
	.pipe(dest(dirs.images.output));
}

export const copy = () => {
	return src(dirs.copy.input, {allowEmpty: true})
	.pipe(dest(dirs.copy.output));
}

export const scripts = () => {
	return src(dirs.scripts.input, {allowEmpty: true})
	.pipe(gulpif(!PRODUCTION, sourcemaps.init()))
	.pipe(babel({presets: ['@babel/env']}))
	.pipe(uglify())
	.pipe(gulpif(!PRODUCTION, sourcemaps.write('.')))
	.pipe(dest(dirs.scripts.output));
}

export const icons = () => {
	return src(dirs.icons.input, {allowEmpty: true})
	.pipe(gulpif(PRODUCTION, imagemin()))
	.pipe(dest(dirs.icons.output));
}

export const watchChanges = () => {
	[styles, images, copy, scripts, icons].forEach(task => {
		watch(dirs[task.name].watch, task);
	});
}

export const dev = series(clean, parallel(styles, images, copy, scripts, icons), watchChanges);
export const build = series(clean, parallel(styles, images, copy, scripts, icons));
export default dev;