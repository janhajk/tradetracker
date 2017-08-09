(function(){

   var data = {};
   var rates = [];
   var positions = [];
   var btc = 0;
   var bar = null;
   var pieTotBtc = null;
   var pieTotMarket = null;
   var chartsDom = null;

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
         col: 'amount',
         class: 'hidden-xs'
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
            if (pp.base=='LTC' && pp.counter=='OKEX') p.value=pp.last*getLastRate(25,1);
         },
         round: 2
      },
      'totUsd': {
         formula : {type:'*', x:'totBtc', y:'btc'},
         round: 0
      },
      '% 1h': {
         formula : function(p, pp) {
            var change = pp.rates[0].change_1h;
            p.value = (change >= 0)?'+'+change:change;
         }
      },
   };

   var labels = {
      btc: 0,
      usd: 0
   };

   var rInterval = 10; // Update interval of rates in seconds

   /**
    * Countdown Progressbar
    * displays time since last update
    */
   var Countdown = function() {
      var lastUpdate = 0;
      var interval = 1 // in seconds
      var dashline = document.getElementById('dashline');
      var bHeight = 5;  // in px
      var bWidth = 100; // in px

      var container = document.createElement('div');
      container.className = 'progress';
      container.style.float = 'right';
      container.style.marginTop = '2px';
      container.style.height = bHeight + 'px';
      container.style.width  = bWidth  + 'px';

      var bar = document.createElement('div');
      bar.className = 'progress-bar progress-bar-danger';
      bar.role = 'progressbar';
      bar.style.width = '10%';

      container.appendChild(bar);
      dashline.appendChild(container);

      // Resets the progress bar to 100%
      this.update = function(){
         lastUpdate = Date.now();
         bar.style.width = '100%';
      };

      // starts the progressbar
      this.start = function(){
         setInterval(function(){
            let level = [40,20];
            let resetAt = 40;
            let min = 10;
            let state = bar.style.width;
            state = Number(state.replace(/[^0-9]/gi,''));
            let step = (100-resetAt) / (rInterval/interval);
            let newState = state - step;
            if (newState <= min) newState = min;
            bar.className = 'progress-bar progress-bar-'+((newState > level[0])?'success':(newState > level[1])?'warning':'danger')
            bar.style.width = newState + '%';
         }, interval*1000);
      };
   };

   /**
    * document Loaded listener
    */
   document.addEventListener('DOMContentLoaded', function() {
      bar = new Countdown();
      // Load Positions
      var request = new XMLHttpRequest();
      request.open('GET', '/position', true);
      request.onload = function() {
         if(request.status >= 200 && request.status < 400) {
            try {
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
               bar.start();
               updateRates();
               chartsDom = new ChartsDom(content);
               pieTotBtc = new TotAssetChart(chartsDom.col1);
               pieTotMarket = new TotMarketChart(chartsDom.col2);
            }
            catch (e) {
               console.log(new Date().toLocaleString() + ': not logged in');
               document.getElementById('content').innerHTML = 'Not logged in.';
            }
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
               try {
                  rates = JSON.parse(request.responseText);
                  let tot = tGetTot();
                  // update Global BTC-Price
                  btc = getLastRate(110,12);
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
                  bar.update();
                  pieTotBtc.update();
                  pieTotMarket.update();
               }
               catch (e) {
                  console.log(new Date().toLocaleString() + ': not logged in');
               }
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


   /**
    * Browser notifications
    */
   document.addEventListener('DOMContentLoaded', function () {
      if (Notification.permission !== "granted")
         Notification.requestPermission();
   });
   var notify = function(params) {
      if (Notification.permission !== 'granted')
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

   /**
    * Change update interval
    */
   var changeUpdateInterval = function() {
      var navbar = document.getElementById('navbarul');
      // <li><a href="#">add position</a></li>
      var li = document.createElement('li');
      var a = document.createElement('a');
   };


   /**
    * Position Table Object
    */
   var Postable = function(positions) {
      this.positions = positions;
      this.render = function(){
         var table = btable();
         for (let i=0;i<positions.length;i++) {
            table[1].tBodies[0].appendChild(positions[i].dom(positions[i]));
         }
         return table[0];
      };
   };


   /**
    * Charts DOM
    */
   var ChartsDom = function(parent) {
      var row = document.createElement('div');
      row.className = 'row';
      var col1 = document.createElement('div');
      col1.className = 'col-sm-4';
      var col2 = document.createElement('div');
      col2.className = 'col-sm-4';
      var col3 = document.createElement('div');
      col3.className = 'col-sm-4';
      row.appendChild(col1);
      row.appendChild(col2);
      row.appendChild(col3);
      parent.appendChild(row);
      this.row = row;
      this.col1 = col1;
      this.col2 = col2;
      this.col3 = col3;
   };


   /**
    * Position Object
    */
   var Position = function(position) {
      var self = this;
      var getTot = function(base, counter, last, amount){
         let tot = {btc:0, usd:0};
         tot.btc = (base === 'BTC' && (counter).substring(0,3) !== 'USD')?last * amount:amount;
         if (base === 'LTC' && counter === 'OKEX') tot.btc = last*getLastRate(25,1);
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
      this.rates  = position.rates;
      this.tot    = getTot(this.base, this.counter, this.last, this.amount);
      this.update = function(){
         self.last = getLastRate(self.aid, self.cid);
         self.rates.unshift(getLatestRate(self.aid, self.cid));
         if (self.rates.length > 3600) self.rates.pop();
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
         /**
          * Calculates cell using formula
          */
         this.calc = function(parent, pos) {
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
         /**
          * Formats a Cell Value to readable format
          */
         this.tValue = function(parent) {
            var html = parent.value;
            if (parent.round === -1) {
               if (typeof html === 'number') {
                  let digits = smartRound(html);
                  html = cutTrailingZeros(html.toLocaleString('de-CH-1996', {minimumFractionDigits:digits}));
                  parent.align = 'right';
               }
            }
            else if (typeof html === 'number' && parent.round >= 0) {
               html = html.toFixed(parent.round);
               html = Number(html).toLocaleString('de-CH-1996', {minimumFractionDigits:parent.round});
            }
            return html;
         };
         /**
          * Updates Cell (only if value has changed)
          */
         this.update = function(pos, parent) {
            let val1 = parent.value;
            parent.calc(parent, pos);
            // update html if value has changed
            if (val1 == null || parent.value !== val1) {
               parent.dom.innerHTML = parent.tValue(parent);
            }
         };
         this.calc(this, pos);
         this.dom = this.render(this);
      };
      // *** END Cell

      // create cell for each col and update
      this.row = {};
      for (let i in cols) {
         let c = new Cell(i, cols[i], this);  // i = colname, cols[i] = defaults, this = pos
         c.update(this, c);
         this.row[i] = c;
      }

      /**
       * Renders DOM of a row
       * returns DOM-<tr>
       */
      this.dom = function(parent){
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
   };

   /**
    * Positions-Table
    * Creates empty positions table
    * Data is added later asynchronously
    */
   var btable = function() {
      var t = document.createElement('table');
      t.className      = ['table', 'table-bordered', 'table-hover', 'table-responsive', 'table-condensed', 'sortable'].join(' ');
      t.style.width    = '100%';
      t.style.maxWidth = '1000px';

      // table header
      var thead   = document.createElement('thead');
      thead.class = 'thead-inverse';
      var tr = document.createElement('tr');
      for (let c in cols) {
         if (cols[c].hidden) continue;
         let th = document.createElement('th');
         th.innerHTML       = c;
         th.className       = cols[c].class?cols[c].class:'';
         th.style.textAlign = cols[c].align?cols[c].align:'left';
         tr.appendChild(th);
      }
      thead.appendChild(tr);
      t.appendChild(thead);

      // Positions
      var tbody = document.createElement('tbody');

      t.appendChild(tbody);
      var div = document.createElement('div');
      div.className = 'table-responsive';
      div.appendChild(t);
      return [div, t];
   };


   /**
    * Get Total of all positions
    */
   var getTot = function() {
      let tot = {btc:0, usd:0};
      for (let i=0;i<positions.length;i++) {
         tot.btc += positions[i].tot.btc;
         tot.usd += positions[i].tot.usd;
      }
      return tot;
   };

   /**
    * Get Total of all positions formated
    */
   var tGetTot = function() {
      let tot = getTot();
      tot.btc = tot.btc.toLocaleString('de-CH-1996', {minimumFractionDigits:2});
      tot.usd = Math.round(tot.usd).toLocaleString('de-CH-1996', {minimumFractionDigits:0});
      return tot;
   };


   /**
    * Get Total of each asset
    */
   var getTotAsset = function() {
      var tot = {};
      var BTC = ['USD', 'OKEX', '1B'];
      for (let i in positions) {
         var assetname = positions[i].assetname;
         if (positions[i].base === 'BTC' && inArray(positions[i].counter, BTC)) assetname = 'Bitcoin';
         if (positions[i].base === 'LTC' && inArray(positions[i].counter, BTC)) assetname = 'Litecoin';
         if (!(assetname in tot)) {
            tot[assetname] = {btc:0,usd:0};
         }
         tot[assetname].btc += positions[i].tot.btc;
         tot[assetname].usd += positions[i].tot.usd;
      }
      var tottot = getTot();
      for (let i in tot) {
         tot[i]['%'] = Math.round(tot[i]/tottot.btc);
      }
      return tot;
   };


   /**
    * Get Total for every market
    */
   var getTotMarket = function() {
      var tot = {};
      for (let i in positions) {
         var market = positions[i].row.market.value;
         if (!(market in tot)) {
            tot[market] = {btc:0,usd:0};
         }
         tot[market].btc += positions[i].tot.btc;
         tot[market].usd += positions[i].tot.usd;
      }
      for (let i in tot) {
         if (tot[i].btc === 0) delete tot[i];
      }
      var tottot = getTot();
      for (let i in tot) {
         tot[i]['%'] = Math.round(tot[i]/tottot.btc);
      }
      return tot;
   };

   /**
    * 
    */
   var chartData = function(tot, colors, self) {
      var labels = self.chart.data.labels;
      var data = self.chart.data.datasets[0];
      var pos = -1;
      for (var i in tot) {
         if (tot[i].btc < 0) tot[i].btc = 0; // Don't use negative positions
         pos = -1;
         for (let s in labels) {
            if (labels[s] === i) {
               pos = s;
               break;
            }
         }
         if (pos === -1) {
            labels.push(i);
            data.data.push(tot[i].btc);
            let r = i;
            data.backgroundColor.push((r in colors)?colors[i]:stringToColour(i));
         }
         else {
            data.data[pos] = tot[i].btc;
         }
      }
   };

   /**
    * Creates empty PieChart Object
    * and appends to parent-DOM
    *
    */
   var emptyPieChart = function(parent) {
      var canvas = document.createElement('canvas');
      canvas.width = '400';
      canvas.height = '400';
      canvas.style.width = '400px';
      canvas.style.height = '400px';
      parent.appendChild(canvas);
      var ctx = canvas.getContext('2d');
      var chart = new Chart(ctx, {
         type: 'doughnut',
         data: {
            datasets: [{
               data: [],
               backgroundColor: []
            }],
            labels: []
         },
         options: {
            cutoutPercentage: 50
         }
      });
      return chart;
   };

   /**
    * Create PieChart of Asset-Distribution
    * @param  {String} parent DOM-parent of Chart
    * @return {String} The reversed string
    */
   var TotAssetChart = function(parent) {
      // Colors that are preset
      // those with no preset color will get
      // an unique color from stringToColor()
      var colors = {
         'Bitcoin'    : '#f7931a',
         'Litecoin'   : '#8b8b8b',
         'Storjcoin X': '#2581fc'
      };
      var self = this;
      // Create new empty ChartJs Object and ad it
      // to parent DOM-Element
      this.chart = emptyPieChart(parent);
      // Handler to update Chart data
      this.update = function() {
         chartData(getTotAsset(), colors, self);
         self.chart.update(); // updates chartjs object (animated stlye)
      };
      // Call chartData() once on object-creation
      // to set initial data-values
      chartData(getTotAsset(), colors, self);
   };

   var TotMarketChart = function(parent) {
      var colors = {
         'Poloniex'     : '#01636f',
         'OKEX'         : '#2581fc',
         'ledger wallet': '#8b8b8b'
      };
      var self = this;
      this.chart = emptyPieChart(parent);
      this.update = function() {
         chartData(getTotMarket(), colors, self);
         self.chart.update(); // updates chartjs object (animated stlye)
      };
      chartData(getTotMarket(), colors, self);
   };

   /**
    * Get last Rate for Asset for specific connector
    *
    * @param  {Number} aid Asset-ID
    * @param  {Number} cid Connector-ID
    * @return {Number} The latest rate; 0 if no rate found
    */
   var getLastRate = function(aid, cid) {
      var best = 0;
      for(let i=0;i<rates.length;i++) {
         if(rates[i].aid === aid && rates[i].cid === cid) {
            return rates[i].last;
         }
         // try to get any rate for aid
         // on the first run
         // even not for same cid
         else if (best === 0 && rates[i].aid === aid) {
            best = rates[i].last;
         }
      }
      return best;
   };

   /**
    * Get latest Rate Object for Asset for specific connector
    *
    * @param  {Number} aid Asset-ID
    * @param  {Number} cid Connector-ID
    * @return {Number} The latest rate; 0 if no rate found
    */
   var getLatestRate = function(aid, cid) {
      var best = 0;
      for(let i=0;i<rates.length;i++) {
         if(rates[i].aid === aid && rates[i].cid === cid) {
            return rates[i];
         }
         // try to get any rate for aid
         // on the first run
         // even not for same cid
         else if (best === 0 && rates[i].aid === aid) {
            best = rates[i];
         }
      }
      return best;
   };

   /**
    * Rounds number in dependence of depth
    * @param {Number} number Value to smart-round
    * @return {Number} smart-rounded number; 0 for default/error
    */
   var smartRound = function(number) {
      number = Math.abs(number);
      if (number == 0)     return 0;
      if (number < 0.0001) return 8;
      if (number < 0.001)  return 7;
      if (number < 0.01)   return 6;
      if (number < 0.1)    return 5;
      if (number < 1)      return 4;
      if (number < 10)     return 3;
      if (number < 100)    return 2;
      if (number < 1000)   return 1;
      return 0;
   };

   var cutTrailingZeros = function(number) {
      number = number.toString();
      newNumber = number;
      if (number.indexOf('.')) {
         while (newNumber.length > 2){
            if (newNumber.slice(-1) != '0') break;
            newNumber = newNumber.slice(0, -1);
         }
      }
      // if '1234.'
      if (newNumber.slice(-1) === '.') {
         newNumber = newNumber.slice(0, -1);
      }
      return newNumber;
   };

   /**
    * Check if an image exists
    * @param {String} image_uri
    * @param {Function} cb callback()
    */
   var imageExists = function (image_uri, td, cb){
      var http = new XMLHttpRequest();
      http.open('HEAD', image_uri, false);
      http.onload = function() {
         cb(http.status != 404, td);
      };
      http.send();
   };

   /**
    * PHP in_array() equivalent
    */
   var inArray = function (needle, haystack) {
      var length = haystack.length;
      for(let i = 0; i < length; i++) {
         if(haystack[i] == needle) return true;
      }
      return false;
   };

   /**
    * Unique color for string
    */
   var stringToColour = function(str) {
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
         hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      var colour = '#';
      for (var i = 0; i < 3; i++) {
         var value = (hash >> (i * 8)) & 0xFF;
         colour += ('00' + value.toString(16)).substr(-2);
      }
      return colour;
   };

})();