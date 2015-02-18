// Include gulp
var gulp = require('gulp'); 

// Include Our Plugins
var jshint = require('gulp-jshint');
var mochaPhantomJS = require('gulp-mocha-phantomjs');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var clean = require('gulp-clean');
var rename = require('gulp-rename');
var git = require('gulp-git');
var bump = require('gulp-bump');
var pkg = require('./package.json');

var paths = {
    scripts: ['js/*.js', 'test/**.*js', '!node_modules/**'],
    tests: 'test/**.*js'
};

gulp.task('clean', function () {
    return gulp.src('./dist', { read: false })
        .pipe(clean());
});

gulp.task('build', ['test', 'clean'], function () {
    return gulp.src('./js/*.js')
        .pipe(concat(pkg.name + '.js'))
        .pipe(gulp.dest('./dist'))
        .pipe(rename(pkg.name + '.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./dist'));
});

// Lint Task
gulp.task('jshint', function() {
    return gulp.src(paths.scripts)
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('test', ['jshint'], function () {
    timestamp = new Date().toJSON().toString();
    return gulp
        .src('tests/index.html')
        .pipe(mochaPhantomJS({reporter: 'xunit', dump:'TEST-pcapijs-'+timestamp+'.xml'}));
});

gulp.task('bump', ['build'], function () {
    return gulp.src(['./package.json', './bower.json'])
        .pipe(bump())
        .pipe(gulp.dest('./'));
});

gulp.task('tag', ['bump'], function () {
    var v = pkg.version;
    var message = 'Release ' + v;

    return gulp.src('./')
        .pipe(git.commit(message))
        .pipe(git.tag(v, message))
        .pipe(git.push('origin', 'master', '--tags'))
        .pipe(gulp.dest('./'));
});

gulp.task('npm', ['tag'], function (done) {
    require('child_process').spawn('npm', ['publish'], { stdio: 'inherit' })
        .on('close', done);
});

// Our default task.
// Builds our math game and runs our tests
gulp.task('default', ['test', 'build']);
gulp.task('ci', ['build']);
gulp.task('release', ['npm']);