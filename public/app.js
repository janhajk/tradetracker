(function(){

   var data = {};
   var rates = [];
   var positions = [];
   var btc = 0;
   var cols = {
      'btc': {
         hidden:true
      },
      'market': {},
      'asset': {},
      'amount': {},
      'open': {},
      'last': {},
      'totBtc': {},
      'totUsd': {
         round: 0
      }
   };
   var rInterval = 10; // Update interval of rates in seconds
   document.addEventListener('DOMContentLoaded', function() {
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
            //content.appendChild(charts());
         } else {
            // Error
         }
      };
      request.onerror = function() {
         console.log('There was an error in xmlHttpRequest!');
      };
      request.send();

      // Update rates interval
      setInterval(function(){
         let request = new XMLHttpRequest();
         request.open('GET', '/rates', true);
         request.onload = function() {
            if(request.status >= 200 && request.status < 400) {
               rates = JSON.parse(request.responseText);
               let tot = tGetTot();
               document.title = 'BTC:' + tot.btc + '/USD:' + tot.usd;
            } else {
               // Error
               console.log('There was an Error when updating rates;')
            }
         };
         request.onerror = function() {
            console.log('There was an error in xmlHttpRequest!');
         };
         request.send();
      }, 10000);
   });

   var Postable = function(positions) {
      this.positions = positions;
      this.render = function(){
         var table = btable();
         for (let i=0;i<positions.length;i++) {
            table.tBodies[0].appendChild(positions[i].dom);
         }
         return table;
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
      this.base = position.base;
      this.counter = position.counter
      this.values = position;
      this.amount = position.amount;
      this.aid = position.aid;
      this.last = position.rates[0].last;
      this.tot = getTot(this.base, this.counter, this.last, this.amount);
      this.update = setInterval(function(){
         self.last = getLatestRate(self.aid, self.cid);
         self.tot = getTot(self.base, self.counter, self.last, self.amount);
         for (let cell in self.row) {
            self.row[cell].update(self, self.row[cell]);
         }
      }, rInterval*1000);

      // Cell-Renderer -> <td>
      var tCell = function(self) {
         var td = document.createElement('td');
         td.innerHTML = self.tValue(this);
         td.style.textAlign = self.align;
         td.style.cursor = 'pointer';
         td.onmousedown = function(){return false};
         td.ondblclick = function(){
            console.log(this.innerHTML);
         };
         return td;
      };
      var cell = function(title, defaults, pos){
         this.title = title;
         this.col = 0;
         this.value = null;
         this.align = 'left';
         this.formula = null;
         this.pos = 0;
         this.hidden = false;
         this.rw = false;
         this.html = '';
         this.round = -1;
         for (let i in defaults) {
            this[i] = defaults[i];
         }
         this.render = tCell;
         this.calc = function(parent, pos){
            if (parent.col) {
               parent.value = pos.values[parent.col];
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
               html = html.toLocaleString('de-CH-1996', {minimumFractionDigits:parent.round});
            }
            return html;
         };
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
      this.row = {};
      for (let i in cols) {
         this.row[i] = new cell(i, cols[i], this);
      }
      this.row.market.col = 'name';
      this.row.asset.col = 'counter';
      this.row.amount.col = 'amount';
      this.row.open.col = 'open';
      this.row.totBtc.formula = function(parent, pos){
         parent.value = (pos.values.counter=='USD')?pos.values.amount:pos.last * pos.values.amount;
      };
      this.row.totUsd.formula = {type:'*', x:'totBtc', y:'btc'};
      this.row.last.formula = function(parent, pos) {
         parent.value = pos.last;
      };
      this.row.btc.formula = function(parent,pos){
         parent.value = btc;
      };

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

   var btable = function() {
      var t = document.createElement('table');
      t.className = 'table-bordered table-hover table-responsive';
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
      return t;
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
      if (number < 1) return 8;
      if (number < 10) return 4;
      if (number < 100) return 3;
      if (number < 1000) return 2;
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
})();