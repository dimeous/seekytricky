const USERNAME = 'test'
const PASSWORD = 'test'
const domain = 'frozensun.ru'
const PORTAL_URL = 'https://dev-player.' + domain
const gMapKey = 'AIzaSyBHuj0J-lz1vJyBg28Z1VWKlwacBJWBB3I'
const mapId = '454dd175f04a3decff2bac7a'

const sess = $.cookie('sess')

const cookieTTL = 7 * 24 * 60 * 60 * 1000

const stageSound = PORTAL_URL + '/assets/sounds/stage.mp3'
const dangerSound = PORTAL_URL + '/assets/sounds/dangerous-sound.mp3'
const gpsPointVisibleSound = PORTAL_URL + '/assets/sounds/gps-point-visible.mp3'

var gameId = $.cookie('gameId') ? $.cookie('gameId') : undefined
var currentStageId = $.cookie('currentStageId')
var lastStagePoints = 0

const playerIcon = document.createElement('img')
playerIcon.src = 'https://player.frozensun.ru/assets/img/marker-arrow.png'
playerIcon.style.width = '30px'
playerIcon.style.height = '30px'

const quill = new Quill('#quillContainer')
var gLoc // navigator.geolocation.watchPosition
const DEF_ZOOM = 18

var timer //game timer

// Need to leave Google map fullscreen mode when the stage is changed
const fullscreen =
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.mozFullScreenElement ||
  document.msFullscreenElement

;((g) => {
  var h,
    a,
    k,
    p = 'The Google Maps JavaScript API',
    c = 'google',
    l = 'importLibrary',
    q = '__ib__',
    m = document,
    b = window
  b = b[c] || (b[c] = {})
  var d = b.maps || (b.maps = {}),
    r = new Set(),
    e = new URLSearchParams(),
    u = () =>
      h ||
      (h = new Promise(async (f, n) => {
        await (a = m.createElement('script'))
        e.set('libraries', [...r] + '')
        for (k in g)
          e.set(
            k.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()),
            g[k],
          )
        e.set('callback', c + '.maps.' + q)
        a.src = `https://maps.${c}apis.com/maps/api/js?` + e
        d[q] = f
        a.onerror = () => (h = n(Error(p + ' could not load.')))
        a.nonce = m.querySelector('script[nonce]')?.nonce || ''
        m.head.append(a)
      }))
  d[l]
    ? console.warn(p + ' only loads once. Ignoring:', g)
    : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)))
})({
  key: gMapKey,
  v: 'beta', // Use the 'v' parameter to indicate the version to use (weekly, beta, alpha, etc.).
})

let map //Google map

let markers = [] // Markers on the map
let markerCircles = [] //
var myMarker //Player marker

$(document).ready(function () {
  initMap().then(function () {
    // Restore game state if the page was reloaded
    if (typeof $.cookie('currentStageId') !== 'undefined') {
      currentStageId = ''
      switchStage(gameId, $.cookie('currentStageId'), false)
    }

    // Enable the game if defined
    if (typeof gameId !== 'undefined') {
      startGPS()
      $('#startCtl').hide()
      $('#stopCtl').show()
    } else {
      $('#startCtl').show()
      $('#stopCtl').hide()
      navigator.geolocation.clearWatch(gLoc)
    }

    // Game Id is also can be supplied with the URL argument
    const params = new URLSearchParams(window.location.search)
    const GETgameId = params.get('gameId')
    if (GETgameId !== null && !gameId) {
      $('#questId').val(GETgameId)
      startGame(GETgameId)
    } else {
      $('#questId').val($.cookie('questId'))
    }
  })
})

// Init Google map
async function initMap() {
  const { Map } = await google.maps.importLibrary('maps')
  const { AdvancedMarkerElement } = await google.maps.importLibrary('marker')
  var zoom = DEF_ZOOM - 17
  var position = { lat: 41.6481520235031, lng: 41.63088530302048 }

  map = new Map(document.getElementById('map'), {
    zoom: zoom,
    center: position,
    mapId: mapId,
  })

  myMarker = new google.maps.marker.AdvancedMarkerElement({
    map,
    title: 'Me',
    draggable: false,
  })
  if (typeof $.cookie('gameId') === String && $.cookie('gameId').length > 0) {
    switchStage($.cookie('gameId'), $.cookie('stageId'), false)
  }
}

function process(pos) {
  const crd = pos.coords
  const req = `${PORTAL_URL}/backend/player/${gameId}/process`
  var speed = crd.speed * 3.6
  var heading = crd.heading
  var alt = crd.altitude
  if (speed === null || isNaN(speed)) {
    speed = 0.01
  }
  if (alt === null || isNaN(alt)) {
    alt = 0
  }
  if (heading === null || isNaN(heading)) {
    heading = 0
  }

  //! Rewrite as an JS object
  const json = `{
  		"lat": ${crd.latitude},
  		"lon": ${crd.longitude},
  		"speed": ${speed},
  		"accuracy": ${crd.accuracy},
	  	"heading": ${heading},
  		"alt": ${alt}
	}`

  if ($.cookie('displayUserOnMap') == 'true') {
    if (myMarker != null) {
      myMarker.setMap(null)
    }
    var position = { lat: crd.latitude, lng: crd.longitude }
    playerIcon.style.transform = `rotate(${crd.heading}deg)`
    myMarker = new google.maps.marker.AdvancedMarkerElement({
      map,
      title: 'Me',
      position: position,
      draggable: false,
      content: playerIcon,
    })
  }
  console.log('process json:')
  console.log(json)

  //! Replace with Ajax()
  $.ajax({
    type: 'POST',
    url: req,
    dataType: 'json',
    crossDomain: true,
    headers: {
      Authorization: 'Basic ' + btoa(USERNAME + ':' + PASSWORD),
      'Content-Type': 'application/json',
      session: sess,
    },
    data: json,
    success: function (process) {
      console.log('process data:')
      console.log(process)
      $('#tools').empty()

      // If the stage was changed
      //$('#d').append(`cookie: ${$.cookie('stageChangeTime')}; stageChangeTime: ${process.data.stageChangeTime}\n`);
      if (
        $.cookie('stageChangeTime') != process.data.stageChangeTime &&
        $.cookie('stageChangeTime') != 'null'
      ) {
        setCookie('stageChangeTime', process.data.stageChangeTime)
        playSound(stageSound)
        switchStage(gameId, process.data.stageId, true)
        return
      }

      var colRows = 12
      if (process.data.points.length % 2 === 0) {
        colRows = 6
      }

      // New point appears visible
      if (process.data.points.length > lastStagePoints && lastStagePoints > 0) {
        playSound(gpsPointVisibleSound)
      }

      // Displaying GPS poins
      process.data.points.sort((a, b) => a.id.localeCompare(b.id))
      process.data.points.forEach(function (point) {
        if (
          (point.radiusVisibility == 0 ||
            point.radiusVisibility > point.distance) &&
          point.distance > 0
        ) {
          const distance = Math.trunc(point.distance)
          if ($.cookie('displayDistance') == 'true') {
            if (point.distance > 999999) {
              colRows = 12
            }
            var pointText = point?.text ? point.text : 'untitled point'
            //! Replace with html template
            $('#tools').append(`
							<div class="col-${colRows}" id="distance-${point.id}">
								<div class="fun-fact text-light" style="padding:5px; background: rgb(0, 26, 98); color: antiquewhite;">
									<div class="counter text-light" style="align-items:baseline;">
										<span style="font-size:30px;">${distance}</span>
										<span style="margin-left:5px; margin-bottom:0px; font-size:18px;">m</span>
									</div>
									<span>${pointText}</span>
                            	</div>
							</div>
						`)
          }
          //$('#d').append($(`#${point.id}`).html() + " - \n");
          displayCircle(point.id, point.radius)
          $(`#${point.id}`).show()
        } else {
          //РќСѓ, РЅР°С€РµР» - С‚Р°Рє РЅР°С€РµР»
          //$(`#${point.id}`).hide();
        }
      })
      if (typeof $.cookie('speed') !== 'undefined') {
        // GPS-run
        const playerSpeed = Math.round((speed / $.cookie('speed')) * 100)
        if (playerSpeed > 100) {
          playerSpeed = 100
        }
        var barColor = 'red'
        if (playerSpeed > 30 && playerSpeed < 70) {
          barColor = 'yellow'
        } else if (playerSpeed >= 70) {
          barColor = '#0c5adb'
        }
        //! Replace with html template
        $('#tools').html(`
					<div class="progress-box text-center space-top">
						<h4>${$.cookie('gpsRunText')}</h4>
						<div class="progress" style="opacity: 1; left: 0px;">
							<div class="progress-bar" role="progressbar" data-width="${playerSpeed}" style="width: ${playerSpeed}%; background-color:${barColor};">
								<span>${playerSpeed}%</span>
							</div>
						</div>
					</div>	
				`)
      }

      lastStagePoints = process.data.points.length
    },
    error: function (jqXHR, exception) {
      $('#btnStop').show()
      console.log(jqXHR)
      console.log(exception)
      $('#d').append(JSON.stringify(jqXHR, null, 2))
    },
  })
}

function Ajax(type, req, json) {
  return $.ajax({
    type: type,
    url: req,
    dataType: 'json',
    crossDomain: true,
    headers: {
      Authorization: 'Basic ' + btoa(USERNAME + ':' + PASSWORD),
      //"Content-Type": application/json,
      session: sess,
    },
    data: json,
  })
}

function setCookie(name, val) {
  var date = new Date()
  date.setTime(date.getTime() + cookieTTL)
  $.cookie(name, val, { expires: date, domain: domain })
}

function removeCookie(name) {
  var date = new Date()
  date.setTime(date.getTime() - cookieTTL)
  $.cookie(name, '', { expires: date, domain: domain })
}

function Dialog(eventId, transferId) {
  //Replace with Ajax()
  $.ajax({
    type: 'POST',
    url: `${PORTAL_URL}/backend/player/${gameId}/dialog/${eventId}?transferId=${transferId}`,
    dataType: 'json',
    crossDomain: true,
    headers: {
      Authorization: 'Basic ' + btoa(USERNAME + ':' + PASSWORD),
      session: sess,
    },
    success: function (content) {
      switchStage(gameId, content.data, false)
    },
    error: function (jqXHR, exception) {
      console.log(jqXHR)
      console.log(exception)
      //$('#player').html(json);
    },
  })
}

function Answer(eventId, userAnswer) {
  setCookie('userAnswer', userAnswer)
  const url = `${PORTAL_URL}/backend/player/${gameId}/answer/${eventId}?userAnswer=${userAnswer}`
  const headers = {
    Authorization: 'Basic ' + btoa(USERNAME + ':' + PASSWORD),
    session: sess,
  }
  //! Replace with Ajax()
  $.ajax({
    type: 'POST',
    url: url,
    dataType: 'json',
    crossDomain: true,
    headers: headers,
    success: function (content) {
      switchStage(gameId, content.data, false)
    },
    error: function (jqXHR, exception) {
      console.log(jqXHR)
      console.log(exception)
      $('#d').html(url + '<br>' + JSON.stringify(headers, null, 2))
      $('#d').append(JSON.stringify(jqXHR, null, 2))
    },
  })
}

function Jump(eventId) {
  //! Replace with Ajax()
  $.ajax({
    type: 'POST',
    url: `${PORTAL_URL}/backend/player/${gameId}/jump/${eventId}`,
    dataType: 'json',
    crossDomain: true,
    headers: {
      Authorization: 'Basic ' + btoa(USERNAME + ':' + PASSWORD),
      session: sess,
    },
    success: function (content) {
      //console.log(content);
      switchStage(gameId, content.data, false)
    },
    error: function (jqXHR, exception) {
      console.log(jqXHR)
      console.log(exception)
      $('#d').append(JSON.stringify(jqXHR, null, 2))
    },
  })
}

$('#btnStart').on('click', function () {
  var questId = $('#questId').val()
  startGame(questId)
})

$('#btnStop').on('click', function () {
  if (confirm('Are you sure?')) {
    stopGame()
  }
})

function startGame(questId) {
  setCookie('questId', questId)
  Ajax('POST', `${PORTAL_URL}/backend/player/start/${questId}`, '{}').then(
    function (game) {
      //console.log(game);
      if (game?.data?.status == 'STARTED') {
        gameId = game.data.id
        setCookie('gameId', game.data.id)
        switchStage(gameId, game.data.currentStageId, true)
        startGPS()
        $('#startCtl').hide()
        $('#btnStop').show()
        $('#bottomBar').show()
        $('#d').empty()
      }
    },
  )
}

function stopGame() {
  gameId = undefined
  removeCookie('gameId')
  removeCookie('currentStageId')
  removeCookie('stageChangeTime')
  $('#startCtl').show()
  $('#btnStop').hide()
  $('#player').empty()
  $('#tools').empty()
  $('#map-wrapper').hide()
  setCookie('displayDistance', false)
  setCookie('displayMap', false)
  setCookie('displayUserOnMap', false)
  navigator.geolocation.clearWatch(gLoc)
  $('#navbar-menu').removeClass('show')
  $('.overlay-screen').removeClass('opened')
  $('#bottomBar').hide()
}

function switchStage(gameId, stageId, newGame) {
  Ajax('GET', `${PORTAL_URL}/backend/player/${gameId}/stage/${stageId}`).then(
    function (stageData) {
      if (newGame === true || currentStageId !== stageId) {
        currentStageId = stageId
        setCookie('currentStageId', stageId)
        setCookie('displayDistance', stageData.data.displayDistance)
        setCookie('displayMap', stageData.data.displayMap)
        setCookie('displayUserOnMap', stageData.data.displayUserOnMap)
        removeCookie('speed')
        removeCookie('gpsRunText')
        draw(stageData.data)
      }

      if (stageData.data.closing === true) {
        navigator.geolocation.clearWatch(gLoc)
      }
    },
  )
}

function draw(currentStage) {
  //	navigator.geolocation.clearWatch(gLoc);
  $([document.documentElement, document.body]).animate(
    {
      scrollTop: $('#player').offset().top - 50,
    },
    500,
  )
  quill.setContents(currentStage?.translations[0]?.text)
  var html = quill.getSemanticHTML()
  $('#player').html(html.replace('*answer*', $.cookie('userAnswer')))
  $('#player').off('click')
  $('#tools').empty()
  $('#btnStop').show()
  $('#bottomBar').show()
  clearMarkers()
  removeCookie('userAnswer')
  if (fullscreen) {
    document.exitFullscreen()
  }

  console.log('currentStage:')
  console.log(currentStage)
  const bounds = new google.maps.LatLngBounds()
  currentStage.events.sort((a, b) => {
    const textA = a.transfers?.[0]?.translations?.[0]?.text?.toLowerCase() || ''
    const textB = b.transfers?.[0]?.translations?.[0]?.text?.toLowerCase() || ''
    if (textA < textB) return -1
    if (textA > textB) return 1
    return 0
  })
  currentStage.events.forEach(function (event) {
    switch (event.type) {
      case 'ANSWER':
        //! Replace with html template
        $('#player').append(`
					<p style="text-align: center;">
						<input type="text" id="event-${event.id}" data-id="${event.id}" class="form-control space-bottom">						
						<button type="button" data-id="${event.id}" name="ANSWER" class="btn btn-xs">
							&gt;&gt;&gt;
						</button>
					</p>
				`)
        break

      case 'DIALOG':
        event.transfers.forEach(function (transfer) {
          //! Replace with html template
          $('#player').append(`
						<p style="text-align: center;">
							<button type="button" data-id="${event.id}" data-transfer-id="${transfer.id}" name="DIALOG" class="btn btn-xs" style="width:80%;">
								${transfer.translations[0].text}
							</button>
						</p>
					`)
        })
        break

      case 'JUMP':
        //! Replace with html template
        $('#player').append(`
					<p style="text-align: center;">
						<button type="button" data-id="${event.id}" name="JUMP" class="btn btn-xs" style="width:80%;">
							${event.transfers[0]?.translations[0]?.text}
						</button>
					</p>
				`)
        break

      case 'GPS':
        const markerData = document.createElement('input')
        markerData.type = 'hidden'

        if ($.cookie('displayMap') == 'true') {
          var position = {
            lat: event.transfers[0]?.lat,
            lng: event.transfers[0]?.lon,
          }
          addMarker(
            position,
            event.transfers[0]?.translations[0]?.text,
            event.id,
          )
          bounds.extend(
            new google.maps.LatLng(
              event.transfers[0]?.lat,
              event.transfers[0]?.lon,
            ),
          )
        }
        break

      case 'GPS_RUN':
        setCookie('speed', event.transfers[0].speed)
        setCookie('gpsRunText', event.transfers[0].translations[0].text)
        playSound(dangerSound)
        break
    }
  })

  /*
  if ($.cookie('displayUserOnMap') == 'true' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      bounds.extend(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));				
    });
  } 
  */
  map.fitBounds(bounds)
  google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
    if (map.getZoom() > DEF_ZOOM) {
      map.setZoom(DEF_ZOOM)
    }
  })

  if (
    ($.cookie('displayMap') == 'true' ||
      $.cookie('displayUserOnMap') == 'true') &&
    markers.length > 0
  ) {
    $('#map-wrapper').show()
  } else {
    $('#map-wrapper').hide()
  }

  $('#player').on('click', 'button', function () {
    switch ($(this).attr('name')) {
      case 'ANSWER':
        Answer($(this).data('id'), $(this).siblings('input[type=text]').val())
        break

      case 'JUMP':
        Jump($(this).data('id'))
        break

      case 'DIALOG':
        Dialog($(this).data('id'), $(this).data('transfer-id'))
        break
    }
  })

  var gameTime = currentStage.timeLeft
  var timeDirectionFlag = false

  if (currentStage.timeLeft < 0) {
    gameTime = currentStage.timeElapsed
    timeDirectionFlag = true
  }
  if (typeof timer != 'undefined') {
    clearInterval(timer)
  }

  //setCookie('stageChangeTime', currentStage.stageChangeTime);
  //lastStagePoints = 0;

  if (currentStage.timeLeft == 0) {
    alert('Time is up! GAME OVER')
    stopGame()
  } else {
    timer = startTimer(gameTime, timeDirectionFlag)
    $('#timeLeft').html(formatTimeCompact(gameTime))
    $('#currentPoints').html(currentStage.currentPoints)
  }
}

// GPS
var options = {
  enableHighAccuracy: true,
  timeout: 1000,
  maximumAge: 0,
}
function error(err) {
  //console.log(err);
  var pos = {
    coords: {
      latitude: 55.979797,
      longitude: 37.898989,
      speed: 1,
      accuracy: 2,
      heading: 1,
      altitude: 100,
    },
  }
  process(pos)
}
function startGPS() {
  gLoc = navigator.geolocation.watchPosition(process, error, options)
}

function addMarker(position, title, id) {
  const markerContent = document.createElement('div')
  markerContent.className = 'marker'
  markerContent.innerText = title
  markerContent.id = id

  const marker = new google.maps.marker.AdvancedMarkerElement({
    map: map,
    content: markerContent,
    position: position,
    draggable: false,
  })
  marker.customId = id
  markers.push(marker)

  //var position = { lat: point.lat, lng: point.lon};

  const markerCircle = new google.maps.Circle({
    strokeColor: 'white',
    strokeOpacity: 0.3,
    strokeWeight: 1,
    fillColor: '#80c0e0',
    fillOpacity: 0.3,
    draggable: false,
    editable: false,
    //	map,
    center: position,
    radius: 0,
    zIndex: 2,
    clickable: false,
  })
  markerCircle.customId = id
  markerCircles.push(markerCircle)
}

function removeMarkerById(id) {
  const index = markers.findIndex((m) => m.customId === id)
  if (index !== -1) {
    markers[index].setMap(null) // СѓР±РёСЂР°РµРј СЃ РєР°СЂС‚С‹
    markers.splice(index, 1) // СѓРґР°Р»СЏРµРј РёР· РјР°СЃСЃРёРІР°
    markerCircles[index].setMap(null)
    markerCircles.splice(index, 1)
  }
}

function clearMarkers() {
  markers.forEach((marker) => (marker.map = null))
  markers = []
  if (myMarker != null) {
    myMarker.setMap(null)
  }
  markerCircles.forEach((circle) => circle.setMap(null))
  markerCircles = []
}

function displayCircle(id, newRadius) {
  const circle = markerCircles.find((c) => c.customId === id)
  if (!circle) return
  circle.setRadius(newRadius) // СЂР°РґРёСѓСЃ РІ РјРµС‚СЂР°С…
  circle.setMap(map)
}

function formatTimeCompact(seconds) {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':')
  } else if (mins > 0) {
    return [mins, secs].map((v) => String(v).padStart(2, '0')).join(':')
  } else {
    return String(secs)
  }
}

function playSound(file) {
  var audio = new Audio(file)
  audio.play().catch((err) => {
    console.log('Unable to play sound: ', err)
  })
}

//РќР°РґРѕ РґРѕРґРµР»Р°С‚СЊ
function startTimer(seconds, increment = true) {
  const span = document.getElementById('timeLeft')
  let current = seconds

  // РїРѕРєР°Р·Р°С‚СЊ РЅР°С‡Р°Р»СЊРЅРѕРµ Р·РЅР°С‡РµРЅРёРµ
  span.textContent = formatTimeCompact(current)

  const id = setInterval(() => {
    current = increment ? current + 1 : current - 1
    span.textContent = formatTimeCompact(current)

    if (!increment && current <= 0) {
      clearInterval(id)
      span.textContent = formatTimeCompact(0) // С„РёРєСЃРёСЂСѓРµРј РЅРѕР»СЊ
      switchStage($.cookie('gameId'), $.cookie('currentStageId'), true)
    }
  }, 1000)

  return id // РІРѕР·РІСЂР°С‰Р°РµРј id РґР»СЏ РІРѕР·РјРѕР¶РЅРѕСЃС‚Рё СЂСѓС‡РЅРѕР№ РѕСЃС‚Р°РЅРѕРІРєРё
}
