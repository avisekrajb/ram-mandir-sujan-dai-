const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const dataDir = path.join(__dirname, 'node_modules', 'geoip-lite', 'data');

// Create directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const files = [
  {
    url: 'https://cdn.jsdelivr.net/npm/geoip-lite@2.0.3/data/geoip-city.dat.gz',
    output: path.join(dataDir, 'geoip-city.dat.gz'),
    extracted: path.join(dataDir, 'geoip-city.dat')
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/geoip-lite@2.0.3/data/geoip-city6.dat.gz',
    output: path.join(dataDir, 'geoip-city6.dat.gz'),
    extracted: path.join(dataDir, 'geoip-city6.dat')
  }
];

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading: ${url}`);
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${outputPath}`);
        resolve();
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

function extractGzip(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Extracting: ${inputPath}`);
    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);
    const gunzip = zlib.createGunzip();
    
    readStream.pipe(gunzip).pipe(writeStream);
    writeStream.on('finish', () => {
      console.log(`✅ Extracted: ${outputPath}`);
      resolve();
    });
    writeStream.on('error', reject);
  });
}

async function downloadGeoIP() {
  console.log('🌍 Starting GeoIP database download...');
  
  try {
    for (const file of files) {
      // Download
      await downloadFile(file.url, file.output);
      // Extract
      await extractGzip(file.output, file.extracted);
      // Optionally delete the .gz file
      fs.unlinkSync(file.output);
    }
    console.log('✅ GeoIP database downloaded and extracted successfully!');
  } catch (error) {
    console.error('❌ Error downloading GeoIP database:', error.message);
    console.log('📌 You can manually download the .dat files and place them in:');
    console.log(`   ${dataDir}`);
  }
}

downloadGeoIP();