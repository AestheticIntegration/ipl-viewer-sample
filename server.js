const express = require('express');
const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const unzip = require('unzip');
const stream = require('stream');

const app = express();

app.use(morgan('dev'));
app.use(fileUpload());
app.use(express.static('static'));

function unzipBundle(file, path, cb) {
    let extract = unzip.Extract({ path: path });
    extract.on('close', function () {
        cb();
    });

    let readable = new stream.Readable();
    readable._read = function () {};
    readable.push(file.data);
    readable.pipe(extract);
    readable.push(null);
}

app.post('/upload', function (req, res) {
    if (!req.files || !req.files['bundle']) {
        res.redirect('/');
    } else {
        let bundleDir = path.join(__dirname, 'static', 'bundle');
        if (fs.existsSync(bundleDir)) {
            fs.removeSync(bundleDir);
        }

        unzipBundle(req.files['bundle'], bundleDir, function () {
            res.redirect('/app');
        });
    }
});

app.get('/api/case/:testScript', function (req, res) {
    let testScriptFilename = req.params['testScript'];

    let manifestPath = path.join(__dirname, 'static', 'bundle', 'manifest.json');
    let manifest = JSON.parse(fs.readFileSync(manifestPath));

    let tsPath = path.join(__dirname, 'static', 'bundle', 'certification', manifest.modelName, req.params['testScript']);
    let ts = fs.readFileSync(tsPath);

    res.send({
        testgen: {
            type: 'conductor',
            testScript: {
                filename: req.params['testScript'],
                body: ts.toString()
            }
        }
    });
});

function renderApp (req, res) {
    let appHtml = path.join(__dirname, 'static', 'app.html');
    fs.readFile(appHtml, 'utf8', function (err, html) {
        res.send(html);
    });
}

app.get('/app', renderApp);
app.get('/app/**', renderApp);

const port = process.env.PORT || 3000;

app.listen(port, function () {
    console.log(`App is listening on port ${port}.`);
});
