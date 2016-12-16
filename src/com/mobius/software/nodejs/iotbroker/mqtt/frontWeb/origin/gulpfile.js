"use strict"
var gulp = require('gulp'),
    wiredep = require('wiredep').stream,
    useref = require('gulp-useref'),
    gulpif = require('gulp-if'),
    uglify = require('gulp-uglify'),
    minifyCss = require('gulp-minify-css'),
    clean = require('gulp-clean'),
    imagemin = require('gulp-imagemin'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    connect = require('gulp-connect'),
    sourcemaps = require('gulp-sourcemaps'),
    ngAnnotate = require('gulp-ng-annotate');

//connect
gulp.task('connect', function() {
    connect.server({
        root: 'app',
        livereload: true,
        fallback: 'app/index.html'
    });
});


//javaScript
gulp.task('js', function() {
    gulp.src(['!app/bower_components/**/*.js', 'app/**/*.js'])
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(ngAnnotate())
        .pipe(sourcemaps.write('/sourcemaps', { addComment: false }))
        .pipe(gulp.dest('app'));
});

//reload 
gulp.task('html', function() {
    gulp.src('./app/*.html')
        .pipe(connect.reload());
});


//staging
gulp.task('stage', function() {
    connect.server({
        root: '../webapp',
        livereload: true,
        fallback: '../webapp/index.html'
    });
});


//autoprefixer
gulp.task('autoprefixer', function() {
    return gulp.src('app/css/src/*.css')
        .pipe(autoprefixer({
            browsers: ['last 15 versions', '> 1%', 'IE 7'],
            cascade: false
        }))
        .pipe(gulp.dest('app/css'));
});

//SASS
gulp.task('sass', function() {
    return gulp.src('app/css/sass/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('app/css/src'));
});

//imagemin
gulp.task('imagemin', function() {
    return gulp.src('app/img/*')
        .pipe(imagemin())
        .pipe(gulp.dest('../webapp/img'));
});

//clean 
gulp.task('clean', function() {
    return gulp.src('../webapp', {
            read: false
        })
        .pipe(clean({
            force: true
        }));
});

//bower
gulp.task('bower', function() {
    gulp.src('./app/*.html')
        .pipe(wiredep({
            directory: "app/bower_components"
        }))
        .pipe(gulp.dest('./app'));
});

//fonts
gulp.task('fonts', ['clean', 'fontawesome'], function() {
    return gulp.src('app/fonts/**.*')
        .pipe(gulp.dest('../webapp/fonts'));
});

//fontawesome
gulp.task('fontawesome', function() {
    return gulp.src('app/bower_components/font-awesome/fonts/**.*')
        .pipe(gulp.dest('app/fonts'));
});

//views
gulp.task('views', ['clean'], function() {
    return gulp.src('app/view/**/*.html')
        .pipe(gulp.dest('../webapp/view'));
});

//
gulp.task('directives', ['clean'], function() {
    return gulp.src('app/js/**/*.html')
        .pipe(gulp.dest('../webapp/js'));
});

//webinf
gulp.task('webinf', ['clean'], function() {
    return gulp.src('app/WEB-INF/**/*.*')
        .pipe(gulp.dest('../webapp/WEB-INF'));
});

//Build
gulp.task('build', ['clean', 'sass', 'autoprefixer', 'bower', 'js', 'imagemin', 'fontawesome', 'fonts', 'directives', 'views', 'webinf'], function() {
    return gulp.src('app/*.html')
        .pipe(useref())
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.css', minifyCss()))
        .pipe(gulp.dest('../webapp'));
});

//watcher
gulp.task('watch', function() {
    gulp.watch('bower.json', ['bower']);
    gulp.watch('app/css/sass/**/*.scss', ['sass']);
    gulp.watch('app/css/src/*.css', ['autoprefixer', 'html']);
    gulp.watch(['./app/*.html', 'app/js/**/*.js'], ['html']);

});

//default 
gulp.task('default', ['connect', 'watch']);