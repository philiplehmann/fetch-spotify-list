const https = require('https')
const { spawn } = require('child_process')

// get list of playlists: https://developer.spotify.com/web-api/console/get-playlist/
const token = '<your-token>'
const playlist = '<your-playlist>'
const user = '<your-user>'

const getTrackList = () => {
  return new Promise((resolve, reject) => {

    const options = {
      hostname: 'api.spotify.com',
      port: 443,
      path: `/v1/users/${user}/playlists/${playlist}?market=CH`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }

    https.get(options,  (res) => {
      if(res.statusCode != 200) {
        return
      }
      let buffer = ''
      res.on('data', (d) => {
        buffer += d
      })
      res.on('end', () => {
        const data = JSON.parse(buffer)
        resolve(data['tracks']['items'].map((item) => {
          const track = item['track']
          return `${track['artists'][0]['name']} ${track['name']}`
        }))
      })
    }).on('error', (e) => {
      reject(e)
    })
  })
}

const getYoutubeUrl = (trackTag) => {
  return new Promise((resolve, reject) => {
    const searchLive = trackTag.match(/live/) ? '' : '-live'
    const options = {
        hostname: 'www.youtube.com',
        port: 443,
        path: `/results?search_query=${encodeURIComponent(trackTag)}+official+${searchLive}&sp=EgQQASAB`,
        method: 'GET'
    }

    https.get(options,  (res) => {
      let buffer = ''
      res.on('data', (d) => {
        buffer += d
      })
      res.on('end', () => {
        const match = buffer.match(/href=\"\/watch\?v=(.*?)\"/)
        if(match) {
          resolve(match[1])
        } {
          reject('nothing found for ' + trackTag)
        }

      })
    }).on('error', (e) => {
      reject(e)
    })
  })
}

const downloadClip = (hash) => {
  return new Promise((resolve, reject) => {
    const ytdl = spawn('youtube-dl', ['--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0', 'https://www.youtube.com/watch?v=' + hash])

    ytdl.on('close', resolve)
  })
}

getTrackList().then((trackList) => {
  trackList.forEach((track) => {
    getYoutubeUrl(track).then(downloadClip)
  })
})
