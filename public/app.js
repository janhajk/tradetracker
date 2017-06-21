(function(){

   var data = {};
   var rates = [];
   var positions = [];
   var btc = 0;
   var updateBar = document.createElement('div');
   var lastUpdate = 0;

   // Table Columns / Structure
   // p  = parent        = cell
   // pp = parent-parent = position
   var cols = {
      'btc': {
         hidden:true,
         formula: function(p,pp){
            p.value = btc;
         }
      },
      'market': {
         col: 'name',
         image: {folder:'markets', filetype: 'png'},
         align: 'center'
      },
      'asset': {
         col: 'assetname',
         image: {folder:'coins/32x32', filetype: 'png'},
         align: 'center'
      },
      'amount': {
         col: 'amount'
      },
      'open': {
         col: 'open',
         class: 'hidden-xs hidden-sm'
      },
      'last': {
         formula: function(p, pp) {
            p.value = pp.last;
         }
      },
      'totBtc': {
         formula : function(p, pp){
            p.value = (pp.counter=='USD')?pp.amount:pp.last * pp.amount;
         },
         round: 2
      },
      'totUsd': {
         formula : {type:'*', x:'totBtc', y:'btc'},
         round: 0
      }
   };

   var labels = {
      btc: 0,
      usd: 0
   };

   var rInterval = 10; // Update interval of rates in seconds

   var updateBarCountdown = function() {
      let state = updateBar.style.width;
      state = Number(state.replace(/[^0-9]/gi,''));
      let step = 60 / rInterval;
      let newState = state - step;
      if (newState <= 10) newState = 10;
      updateBar.className = 'progress-bar progress-bar-' + ((newState > 40)?'success':(newState > 20)?'warning':'danger')
      updateBar.style.width = newState + '%';
   };

   document.addEventListener('DOMContentLoaded', function() {
      let div = document.createElement('div');
      div.appendChild(updateBar);
      div.className = 'progress';
      let dashline = document.getElementById('dashline');
      dashline.appendChild(div);
      updateBar.className = 'progress-bar';
      updateBar.role = 'progressbar';
      updateBar.style.width = '0%';
      // Load Positions
      var request = new XMLHttpRequest();
      request.open('GET', '/position', true);
      request.onload = function() {
         if(request.status >= 200 && request.status < 400) {
            data = JSON.parse(request.responseText);
            btc = data.BTC.bitstamp.last;
            for (let i in data.positions) {
               positions.push(new Position(data.positions[i]));
            }
            var table = new Postable(positions);
            var content = document.getElementById('content');
            content.innerHTML = '';
            content.appendChild(table.render());
            $.bootstrapSortable({ applyLast: true });
            setInterval(updateBarCountdown, 1000);
            updateRates();
            //content.appendChild(charts());
         } else {
            // Error
         }
      };
      request.onerror = function() {
         console.log('There was an error in xmlHttpRequest!');
      };
      request.send();

      var updateRates = function() {
         let request = new XMLHttpRequest();
         request.open('GET', '/rates', true);
         request.onload = function() {
            if(request.status >= 200 && request.status < 400) {
               rates = JSON.parse(request.responseText);
               let tot = tGetTot();
               // update Global BTC-Price
               btc = getLatestRate(110,12);
               document.title = tot.btc + '/' + tot.usd;
               for (let i in positions) {
                  positions[i].update();
               }
               if (!labels.btc) {
                  let dashline = document.getElementById('dashline');
                  labels.btc = document.createElement('span');
                  labels.btc.className = 'label label-success';
                  dashline.appendChild(labels.btc);
               }
               labels.btc.innerHTML = 'Tot BTC: ' + tot.btc;
               if (!labels.usd) {
                  let dashline = document.getElementById('dashline');
                  labels.usd = document.createElement('span');
                  labels.usd.className = 'label label-primary';
                  dashline.appendChild(labels.usd);
               }
               labels.usd.innerHTML = 'Tot USD: ' + tot.usd;
               lastUpdate = Date.now();
               updateBar.style.width = '100%';
            } else {
               // Error
               console.log('There was an Error when updating rates;')
            }
         };
         request.onerror = function() {
            console.log('There was an error in xmlHttpRequest!');
         };
         request.send();
      };
      // Update rates interval
      setInterval(updateRates, rInterval*1000);

      // Keyboard Shortkeys
      window.addEventListener("keypress", myEventHandler, false);
      function myEventHandler(e){
         var keyCode = e.keyCode;
         console.log(e.keyCode);
         // 43 = +
         // 45 = -
      };
   });

   // Grant Browser notifications
   document.addEventListener('DOMContentLoaded', function () {
      if (Notification.permission !== "granted")
         Notification.requestPermission();
   });

   var notify = function(params) {
      if (Notification.permission !== "granted")
         Notification.requestPermission();
      else {
         let title = params.title;
         let body = params.body;
         let notification = new Notification(title, {
            icon: 'images/logo/logo512.png',
            body: body,
         });
         notification.onclick = function () {
            alert('!');
         };
      }
   }

   var changeUpdateInterval = function() {
      var navbar = document.getElementById('navbarul');
      // <li><a href="#">add position</a></li>
      var li = document.createElement('li');
      var a = document.createElement('a');
   };

   var Postable = function(positions) {
      this.positions = positions;
      this.render = function(){
         var table = btable();
         for (let i=0;i<positions.length;i++) {
            table[1].tBodies[0].appendChild(positions[i].dom);
         }
         return table[0];
      };
   };

   // Spalten in der Reihenfolge der Darstellung
   var Position = function(position) {
      var self = this;
      var getTot = function(base, counter, last, amount){
         let tot = {btc:0, usd:0};
         tot.btc = (base === 'BTC' && (counter).substring(0,3) !== 'USD')?last * amount:amount;
         tot.usd = tot.btc * btc;
         return tot;
      };
      this.name = position.name;
      this.assetname = position.assetname;
      this.base = position.base;
      this.counter = position.counter
      this.pair   = this.base + '/' + this.counter;
      this.amount = position.amount;
      this.open   = position.open;
      this.aid    = position.aid;
      this.last   = position.rates[0].last;
      this.tot    = getTot(this.base, this.counter, this.last, this.amount);
      this.update = function(){
         self.last = getLatestRate(self.aid, self.cid);
         self.tot = getTot(self.base, self.counter, self.last, self.amount);
         for (let cell in self.row) {
            self.row[cell].update(self, self.row[cell]);
         }
      };

      // Cell Object
      var Cell = function(title, defaults, pos){
         var self = this;
         var parent = pos;
         this.title = title;
         this.col = 0;
         this.value = null;
         this.align = 'left';
         this.formula = null;
         this.pos = 0;
         this.hidden = false;
         this.rw = false;
         this.html = '';
         this.class = '';
         this.round = -1;
         this.image = 0;
         // Set defaults
         for (let i in defaults) {
            this[i] = defaults[i];
         }
         this.render =  function(self) {
            var td = document.createElement('td');
            if (self.value !== null && self.image) {
               td.innerHTML = '';
               let value = self.value.replace(/\s/g, '-').toLowerCase();
               let path = 'images/' + self.image.folder + '/';
               let src = path + value + '.' + self.image.filetype;
               if (!imageExists(src)) src = path + 'wallet.png';
               td.style.backgroundImage = 'url('+src+')';
               td.style.backgroundRepeat = 'no-repeat';
               td.style.backgroundSize = 'Auto 25px';
               td.title = self.value;
               td.style.backgroundPosition = self.align;
               //img.title = self.tValue(this);
            }
            else {
               td.innerHTML = self.tValue(this);
            }
            td.style.textAlign = self.align;
            td.style.cursor = 'pointer';
            td.className = self.class;
            td.onmousedown = function(){return false};
            td.ondblclick = function(){
               console.log(this.self.value);
            };
            return td;
         };
         this.calc = function(parent, pos){
            if (parent.col) {
               parent.value = pos[parent.col];
            }
            if (parent.formula !== null) {
               if (typeof parent.formula === 'function') {
                  parent.formula(parent, pos);
               }
               else if (parent.formula.type === '*') {
                  parent.value = pos.row[parent.formula.x].value * pos.row[parent.formula.y].value;
               }
            }
         };
         this.tValue = function(parent){
            var html = parent.value;
            if (parent.round === -1) {
               if (typeof html === 'number') {
                  let digits = smartRound(html);
                  html = html.toLocaleString('de-CH-1996', {minimumFractionDigits:digits});
                  parent.align = 'right';
               }
            }
            else if (typeof html === 'number' && parent.round >= 0) {
               html = html.toFixed(parent.round);
               html = Number(html).toLocaleString('de-CH-1996', {minimumFractionDigits:parent.round});
            }
            return html;
         };
         this.calc(this, pos);
         this.dom = this.render(this);
         this.update = function(pos, parent) {
            let val1 = parent.value;
            parent.calc(parent, pos);
            // if value have changed, udpate html
            if (val1 == null || parent.value !== val1) {
               parent.dom.innerHTML = parent.tValue(parent);
            }
         };
      };

      // create cell for each row
      this.row = {};
      for (let i in cols) {
         this.row[i] = new Cell(i, cols[i], this);
      }

      // Row-Renderer -> <tr>
      this.tr = function(parent){
         let cells = [];
         for (let cell in parent.row) {
            if (!parent.row[cell].hidden) {
               cells.push(parent.row[cell].dom);
            }
         }
         let tr = document.createElement('tr');
         for (let i in cells) {
            tr.appendChild(cells[i]);
         }
         return tr;
      };
      this.dom = this.tr(this);
      for (let cell in this.row) {
         this.row[cell].update(this, this.row[cell]);
      }
   };

   /*
    * Positions-Table
    */
   var btable = function() {
      var t = document.createElement('table');
      t.className = 'table table-bordered table-hover table-responsive table-condensed sortable';
      t.style.width = '100%';
      t.style.maxWidth = '1000px';
      var thead = document.createElement('thead');
      thead.class = 'thead-inverse';

      // table header
      var tr = document.createElement('tr');
      var th;
      for (let c in cols) {
         if (cols[c].hidden) continue;
         th = document.createElement('th');
         th.innerHTML = c;
         th.className = cols[c].class;
         if (cols[c].align) th.style.textAlign = cols[c].align;
         tr.appendChild(th);
      }
      thead.appendChild(tr);
      t.appendChild(thead);

      // Positions
      var tbody = document.createElement('tbody');
      let tot = {btc:0, usd:0};

      // Total Row
      /*let lastRow = new columns();
      tr = document.createElement('tr');
      for (let i in lastRow) {lastRow[i] = ftd('');}
      lastRow['Tot BTC'] = ftd(Math.round(tot.btc*100)/100, 'right');
      lastRow['Tot USD'] = ftd(tot.usd, 'right');
      lastRow.Market = ftd('Total');
      for (let i in lastRow) {
         tr.appendChild(lastRow[i]);
      }
      tbody.appendChild(tr); */
      // End Last Row
      t.appendChild(tbody);
      var div = document.createElement('div');
      div.className = 'table-responsive';
      div.appendChild(t);
      return [div, t];
   };

   var getTot = function() {
      let tot = {btc:0, usd:0};
      for (let i=0;i<positions.length;i++) {
         tot.btc += positions[i].tot.btc;
         tot.usd += positions[i].tot.usd;
      }
      return tot;
   };

   var tGetTot = function() {
      let tot = getTot();
      tot.btc = tot.btc.toLocaleString('de-CH-1996', {minimumFractionDigits:2});
      tot.usd = Math.round(tot.usd).toLocaleString('de-CH-1996', {minimumFractionDigits:0});
      return tot;
   };


   var getLatestRate = function(aid, cid) {
      let best = 0;
      for(let i=0;i<rates.length;i++) {
         if (best === 0 && rates[i].aid === aid) {
            best = rates[i].last;
         }
         else if(rates[i].aid === aid && rates[i].cid === cid) {
            best = rates[i].last;
            break;
         }
      }
      return best;
   };

   var smartRound = function(number) {
      if (number == 0) return 0;
      if (number < 0.0001) return 8;
      if (number < 0.001) return 7;
      if (number < 0.01) return 6;
      if (number < 0.1) return 5;
      if (number < 1) return 4;
      if (number < 10) return 3;
      if (number < 100) return 2;
      if (number < 1000) return 1;
      return 0;
   };

   var charts = function(){
      var canvas = document.createElement('canvas');
      canvas.height = '300';
      canvas.width = '300';
      var ctx = canvas.getContext('2d');
      var assetChart = new Chart(ctx, {
         type: 'pie',
         data: {
            labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
            datasets: [{
               data: [12, 19, 3, 5, 2, 3]
            }]
         }
      });
      return canvas;
   };

   var imageExists = function (image_url){
      var http = new XMLHttpRequest();
      http.open('HEAD', image_url, false);
      http.send();
      return http.status != 404;
   };

})();