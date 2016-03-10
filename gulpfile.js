var path = require('path');
var fs = require('fs');
var gulp = require("gulp");
var babel = require("gulp-babel");
var clean = require('gulp-clean');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util')
var eslint = require('gulp-eslint');
var plumber = require('gulp-plumber');

var getTestRunner = function() {
  return gulp.src('dist/test/*.js', {read: false})
    // gulp-mocha needs filepaths so you can't have any plugins before it 
    .pipe(mocha({ui: 'tdd'}))
    .on("error", function() {
      gutil.beep();
      gutil.log(gutil.colors.red('Tests failed!\n\n\n'));
    });
}

var runTestRunnerAndWait = function() {
  getTestRunner().on('end', function() {
    gutil.log("Watching...");
  });
}

gulp.task("clean", function() {
  return gulp.src('dist/', {read: false}).pipe(clean());
});

gulp.task("watch", ["build"], function() {
  runTestRunnerAndWait()

  return gulp.watch(["src/index.js", "src/**/*.js"], function(file) {
    //only compile files that change
    var compilePath = path.relative("./src/", file.path);
    var srcFile = "src/" + compilePath
    var destFile = "dist/" + compilePath;
    var destPath = path.dirname(destFile);
    var compileSuccessful = true;
    
    if(fs.existsSync(destFile)) {
      fs.unlinkSync(destFile);
    }

    gulp.src(srcFile)
      .pipe(plumber({
          errorHandler: function (error) {
            compileSuccessful = false;
            var err = new gutil.PluginError('Compile: Babel', error, {showStack: true});
            gutil.beep();
            gutil.log(err.toString() + "\n\n\nWatching...");
            return false
          }
      }))
      .pipe(babel())
      .pipe(gulp.dest(destPath))
      .on('end', function() {
        if(compileSuccessful) {
          gutil.log(`File compiled: ${destFile}\n\n`);
          runTestRunnerAndWait()
        }
      });
  });
});

gulp.task("run-tests", function() {
  return getTestRunner();
});

gulp.task("test", ["build", "run-tests"]);

gulp.task("build", ["clean"], function () {
  return gulp.src(["src/index.js", "src/**/*.js"])
    .pipe(babel())
    .pipe(gulp.dest("dist"));
});
