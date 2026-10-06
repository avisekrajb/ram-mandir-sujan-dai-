// scripts/downloadGeoIP.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const dataDir = path.join(__dirname, '..', 'node_modules', 'geoip-lite', 'data');

// Create directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`📁 Created directory: ${dataDir}`);
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
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${path.basename(outputPath)}`);
        resolve();
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

function extractGzip(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Extracting: ${path.basename(inputPath)}`);
    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);
    const gunzip = zlib.createGunzip();
    
    readStream.pipe(gunzip).pipe(writeStream);
    writeStream.on('finish', () => {
      console.log(`✅ Extracted: ${path.basename(outputPath)}`);
      // Delete the .gz file after extraction
      try {
        fs.unlinkSync(inputPath);
      } catch (e) {
        // Ignore
      }
      resolve();
    });
    writeStream.on('error', reject);
  });
}

async function downloadGeoIP() {
  console.log('🌍 Starting GeoIP database download...');
  console.log(`📁 Target directory: ${dataDir}`);
  
  try {
    for (const file of files) {
      // Download
      await downloadFile(file.url, file.output);
      // Extract
      await extractGzip(file.output, file.extracted);
    }
    console.log('✅ GeoIP database downloaded and extracted successfully!');
    console.log('📁 Files saved in:', dataDir);
  } catch (error) {
    console.error('❌ Error downloading GeoIP database:', error.message);
    console.log('📌 You can manually download the .dat files and place them in:');
    console.log(`   ${dataDir}`);
    console.log('📌 Download from:');
    console.log('   https://cdn.jsdelivr.net/npm/geoip-lite@2.0.3/data/geoip-city.dat.gz');
    console.log('   https://cdn.jsdelivr.net/npm/geoip-lite@2.0.3/data/geoip-city6.dat.gz');
  }
}

downloadGeoIP();