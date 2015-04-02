require('shelljs/global');

rm('dist/pcapi.js')
cp('js/pcapi.js', 'dist/pcapi.js');
