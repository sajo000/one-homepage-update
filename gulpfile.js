// gulpfile.js
const { src, dest, watch, series, parallel } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);

const paths = {
  html: {
    src: 'src/**/*.html',
    dest: 'dist/'
  },
  styles: {
    src: 'src/assets/scss/**/*.scss',
    entry: 'src/assets/scss/*.scss',
    dest: 'dist/assets/css/'
  }
};

// dist 비우기
async function clean() {
  // del ESM 동적 import
  const { deleteAsync } = await import('del');
  return deleteAsync(['dist']);
}

// HTML 복사 (구조 유지)
function html() {
  return src(paths.html.src, { base: 'src' })
    .pipe(dest(paths.html.dest));
}

// SCSS → CSS
function styles() {
  return src(paths.styles.entry)
    .pipe(sass({ outputStyle: 'expanded' }).on('error', sass.logError))
    .pipe(dest(paths.styles.dest));
}

// assets 복사 (scss 제외)
async function assets() {
  const { glob } = await import('glob');

  const files = await glob('src/assets/**/*', {
    nodir: true,
    ignore: ['src/assets/scss/**'], // scss 제외
  });

  for (const file of files) {
    const rel = path.relative('src/assets', file);   // 예: images/foo.png
    const destPath = path.join('dist/assets', rel);  // dist/assets/images/foo.png
    const dir = path.dirname(destPath);

    await mkdir(dir, { recursive: true });
    await copyFile(file, destPath);
  }
}

// watch
function watchFiles() {
  watch(paths.html.src, html);
  watch(paths.styles.src, styles);
  // assets도 변경 감시 (이미지/영상/폰트 등)
  watch('src/assets/**/*', { delay: 500 }, assets);
}

const build = series(
  clean,
  parallel(html, styles, assets)
);

exports.clean = clean;
exports.html = html;
exports.styles = styles;
exports.assets = assets;
exports.build = build;
exports.default = series(build, watchFiles);