const fs        = require('fs')
    , path      = require('path')
    , os        = require('os')
    , onlyAsync = require('workshopper/verify-calls').verifyOnlyAsync
    , requires  = require('workshopper/fetch-requires')
    , bold      = require('workshopper/term-util').bold
    , red       = require('workshopper/term-util').red

    , files = [
          'learnyounode.dat'
        , 'learnyounode.txt'
        , 'learnyounode.sql'
        , 'api.html'
        , 'README.md'
        , 'CHANGELOG.md'
        , 'LICENCE.md'
        , 'md'
        , 'data.json'
        , 'data.dat'
        , 'words.dat'
        , 'w00t.dat'
        , 'w00t.txt'
        , 'wrrrrongdat'
      ]

    , dir       = path.join(os.tmpDir(), 'learnyounode_' + process.pid)
    , trackFile = path.join(os.tmpDir(), 'learnyounode_' + process.pid + '.json')


function verify (trackFile, callback) {
  onlyAsync(trackFile, function (err) {
    if (err)
      return callback(err)

    requires(trackFile, function (err, main, required) {
      if (err)
        return callback(err)

      var returned  = false
        , _callback = callback
        , callbackUsed

      callback = function () {
        returned = true
        _callback.apply(this, arguments)
      }

      if (required.length == 1) {
        console.log('\nYou got the correct answer but only used ' + bold('one') + ' file:')
        console.log('\t' + bold(red(required[0])))
        console.log(
            '\nThis problem requires you to use '
          + bold('one additional')
          + ' module file.\n'
        )

        return callback('bzzt!')
      }

      var modfile = required.filter(function (r) { return r != main })[0]
        , mod     = require(modfile)

      if (typeof mod != 'function') {
        console.log('\nYour additional module file:')
        console.log('\t' + modfile)
        console.log('does not export a ' + bold('single function') + '.')
        console.log('\nYou must use the `module.exports = function () {}` pattern\n')

        return callback('bzzt!')
      }

      if (mod.length < 3) {
        console.log('\nYour additional module file:')
        console.log('\t' + modfile)
        console.log('exports a function that takes fewer than ' + bold('three') + ' arguments.')
        console.log('\nYou must accept a directory, a filter and a ' + bold('callback') + '.\n')

        return callback('bzzt!')
      }

      fs.$readdir = fs.readdir
      var error = new Error('testing')
      fs.readdir = function (dir, callback) {
        callback(error)
      }

      function noerr () {
        console.log('\nYour additional module file:')
        console.log('\t' + modfile)
        console.log('does not appear to pass back an error received from `fs.readdir()`')
        console.log('\nUse the following idiomatic Node.js pattern inside your callback to `fs.readdir()`:')
        console.log('\tif (err)\n\t  return callback(err)\n')

        return callback('bzzt!')        
      }

      var callbackUsed = false
      try {
        mod('/foo/bar/', 'wheee', function (err) {
          if (err !== error)
            return noerr()

          callbackUsed = true
        })
      } catch (e) {
        noerr()
      }

      setTimeout(function () {
        if (returned)
          return

        if (!callbackUsed) {
          console.log('\nYour additional module file:')
          console.log('\t' + modfile)
          console.log('did not call the callback argument')
          return callback('bzzt!')
        }

        fs.readdir = fs.$readdir

        callbackUsed = false
        try {
          mod(dir, 'md', function (err, list) {
            if (err) {
              console.log('\nYour additional module file:')
              console.log('\t' + modfile)
              console.log('returned an error on its callback:')
              console.log(err)
              return callback('bzzt!')
            }

            callbackUsed = true

            var exp = files.filter(function (f) { return /\.md$/.test(f) })
              , m   = Array.isArray(list) && exp.length === list.length
              , i   = 0
              , j
              , f

            for (; m && i < exp.length; i++) {
              f = false
              for (j = 0; m && !f && j < list.length; j++)
                if (list[j] === exp[i])
                  f = true
              if (!f)
                m = false
            }

            if (!m) {
              console.log('\nYour additional module file:')
              console.log('\t' + modfile)
              console.log('did not return the correct list of files in an array as the second arugment of the callback')
              return callback('bzzt!')
            }

            //WIN!!
            callback()
          })
        } catch (e) {
          console.log('\nYour additional module file:')
          console.log('\t' + modfile)
          console.log('threw an error:')
          console.log(e)

          return callback('bzzt!')        
        }

        setTimeout(function () {
          if (returned)
            return

          if (!callbackUsed) {
            console.log('\nYour additional module file:')
            console.log('\t' + modfile)
            console.log('did not call the callback argument')
            return callback('bzzt!')
          }
        }, 500)
      }, 500)
    })
  })
}

module.exports = function () {
  fs.mkdirSync(dir)
  files.forEach(function (f) {
    fs.writeFileSync(path.join(dir, f), 'nothing to see here', 'utf8')
  })

  return {
      args        : [ dir, 'md' ]
    , stdin       : null
    , modUseTrack : {
          trackFile : trackFile
        , modules   : [ 'fs' ]
      }
    , verify      : verify.bind(null, trackFile)
  }
}
