
(function() {

  var socket, term;

  Terminal.applyAddon(fit);
  Terminal.applyAddon(winptyCompat);

  term = new Terminal({
    convertEol: true,
    cursorBlink: true,
    theme: {
      background: '#111'
    }
  });
  term.winptyCompatInit();
  term.open(document.getElementById('terminal'));

  var protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
  var port = location.port ? `:${location.port}` : '';

  function connectWS(){
      console.log("Connecting...");

      socket = new WebSocket(protocol + location.hostname + port);
      socket.onclose = function() {
        term.write("\n== disconnected ==\n");
        setTimeout(connectWS, 1000);
      }

      socket.onopen = () => {
        resizeHandler();
        term.write("\n== connected ==\n");
      };
      socket.onmessage = (ev) => {
        var msg;
        try {
          msg = JSON.parse(ev.data);
        } catch (e) {
          console.log(message.data);
          return;
        }
        if (msg.type == "data") {
          term.write(msg.data.replace(/[\x7F]/g, "\b \b"));
        } else if (msg.type == "title") {
          document.title = msg.data;
        }
      };
  }
  
  connectWS();

  term.on('data', d => {
    socket.send(JSON.stringify({ type: 'data', data: d }));
  })
  
  window.addEventListener("resize", resizeThrottler, false);

  var resizeTimeout;
  function resizeThrottler() {
    if ( !resizeTimeout ) {
      resizeTimeout = setTimeout(function() {
        resizeTimeout = null;
        resizeHandler();     
       }, 66);
    }
  }

  function resizeHandler() {
    term.fit();
    socket.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }));
  }

  term.fit();

}());
