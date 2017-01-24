# IoTBroker.Cloud Node.js Client

IoTBroker.Cloud is a Node.js client which allows to connect to MQTT server. IoTBroker.Cloud sticks to [MQTT 3.1.1](http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.pdf) standards. 

## Features

* **Clean / persistent session.** When the client disconnects, its session state can be stored (if you set Clean session flag to false) or removed (if you set Clean session flag to true). The session state includes subscriptions and incoming QoS 1 and QoS 2 messages while the client is off.

* **Last Will and Testament.** This feature implies that if a client goes offline without sending DISCONNECT message (due to some failure), other clients will be notified about that.

* **Keep Alive.** If Keep Alive is higher than 0, the client and the server is constantly exchanging PING messages to make sure whether the opposite side is still available. 

* **Retain messages.** It allows to "attach" a message to a particular topic, so the new subscribers become immediately aware of the last known state of a topic.

* **Assured message delivery.** Each message is sent according to the level of Quality of Service (QoS). QoS has 3 levels:
- QoS 0 (At most once) — a message is sent only one time. The fastest message flow, but message loss may take place. 
- QoS 1 (At least once) — a message is sent at least one time. The message duplication may occur.  
- QoS 2 (Exactly once) — a message is sent exactly one time.  But QoS 2 message flow is the slowest one. 

## Getting Started

These instructions will help you get a copy of the project and run it locally.

### Prerequisites

The following programs should be installed before starting to clone IoTBroker.Cloud Node.js Client:

* [Node.js](https://nodejs.org/en/download)
* [npm](https://docs.npmjs.com/cli/install)
* [RabbitMQ](https://www.rabbitmq.com/download.html)
* [gulp](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md) (if you want to run the client locally)

### Installation

First you should run RabbitMQ server if you haven't done it before:

```
sudo service rabbitmq-server start
```

Then you should create gulpfile.js file which contains the following:

```
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
```

It is necessary to put this gulpfile.js to the *origin* folder (*home/username/iotbroker.cloud-nodejs-client/src/com/mobius/software/nodejs/iotbroker/mqtt/frontWeb/origin*).  

Now you have to open the terminal and ```cd``` to *home/username/iotbroker.cloud-nodejs-client/src/com/mobius/software/nodejs/iotbroker/mqtt/frontWeb/origin* and run the following command:
```
gulp 
```
Next ```cd``` to *home/username/iotbroker.cloud-nodejs-client/src/com/mobius/software/nodejs/iotbroker/mqtt/testWeb* and run the following command:
```
node web.js
```
Finally you should go to the URL where it is deployed. Usually it is http://localhost:8080/

When you finished with deployment, you can log in to your account and connect to the server. Please note that at this stage it is not possible to register as a client. You can log in to your existing account.

## [License](LICENSE.md)
