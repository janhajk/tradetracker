(function(){

   var data = {};
   var rates = [];
   var positions = [];
   var cols = ['market', 'asset', 'pair', 'amount', 'open', 'last', 'totBtc', 'totUsd', 'btc'];
   var rInterval = 10; // Update interval of rates in seconds
   document.addEventListener('DOMContentLoaded', function() {
      // Load Positions
      var request = new XMLHttpRequest();
      request.open('GET', '/position', true);
      request.onload = function() {
         if(request.status >= 200 && request.status < 400) {
            data = JSON.parse(request.responseText);
            for (let i in data) {
               positions.push(new Position(data[i]));
            }
            var table = new Postable(positions);
            var content = document.getElementById('content');
            content.innerHTML = '';
            content.appendChild(table.render());
            content.appendChild(charts());
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
         for (let i in positions) {
            table.tBodies[0].appendChild(positions[i].dom);
         }
      };
   };

   // Spalten in der Reihenfolge der Darstellung
   var Position = function(position) {
      this.values = position;
      this.aid = position.aid;
      this.last = position.last;
      this.update = setInterval(function(){
         for(let i in rates) {
            if(rates[i].pair === position.pair && rates[i].mid = position.mid) {
               this.last = rates[i].last;
            }
         }
         for (let cell in this.row) {
            this.row[cell].udpate();
         }
      }, rInterval*1000);

      // Cell-Renderer -> <td>
      var tCell = function() {
         var td = document.createElement('td');
         td.innerHTML = this.TValue(this);
         td.style.textAlign = this.align;
         td.style.cursor = 'pointer';
         td.onmousedown = function(){return false};
         td.ondblclick = function(){
            console.log(this.innerHTML);
         };
         return td;
      };
      var cell = function(title, row){
         this.title = title;
         this.col = 0;
         this.value = null;
         this.render = tCell;
         this.calc = function(){
            if (this.formula !== null) {
               if (typeof this.formula === 'function') {
                  this.formula(this);
               }
               else if (this.formula.type === '*') {
                  this.value = row[this.formula.x].value * row[this.formula.y].value;
               }
            }
         };
         this.tValue = function(parent){
            let html = parent.value;
            if (typeof html === 'number') {
               let digits = (html<10)?8:0;
               html = html.toLocaleString('de-CH-1996', {minimumFractionDigits:digits});
               parent.align = 'right';
               return html;
            }
         };
         this.align = 'left';
         this.formula = null;
         this.pos = 0;
         this.visible = true;
         this.rw = false;
         this.html = '';
         this.dom = null;
         this.update = function() {
            let val1 = this.value;
            this.calc();
            // if value have changed, udpate html
            if (this.value !== val1) {
               this.dom.innerHTML = this.tValue(this);
            }
         };
      };
      this.row = {};
      for (let i in cols) {
         this.row[cols[i]] = new cell(cols[i], this.row);
      }
      this.col.market.col = 'cid';
      this.col.asset.col = 'aid';
      this.col.totBtc.formula = {type:'*', x:'btc', y:'amount'};
      this.col.totUsd.formula = {type:'*', x:'totBtc', y:'btcusd'};
      this.col.last.formula = function(parent) {
         this.value = parent.last;
      };

      // Row-Renderer -> <tr>
      this.tr = function(){
         let cells = [];
         for (let cell in this.row) {
            cells.push(this.row[cell].dom);
         }
         let tr = document.createElement('tr');
         for (let i in cells) {
            tr.appendChild(cells[i]);
         }
         return tr;
      };
      this.dom = tr();
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
         th = document.createElement('th');
         th.innerHTML = cols[c];
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

   var positionsRow = function(position) {
      var pos = new columns();
      pos.market.value = position.name;
      pos.market.cell = ftd(pos.market);
      pos.asset.value = position.counter;
      pos.asset.cell = ftd(pos.asset);
      pos.pair.value = position.base + '_' + position.counter;
      pos.pair.cell = ftd(pos.pair);
      pos.amount.value = position.amount;
      pos.amount.cell = ftd(pos.amount);
      pos.open.value = position.open;
      pos.open.cell = ftd(position.open, 'right', position.open<10?8:0);
      pos.last.value = position.rates[0].last;
      pos.last.cell = ftd(position.rates[0].last, 'right', position.rates[0].last<10?8:0);
      let btc = position.amount * (position.counter.substr(0,3)==='USD'?1:position.rates[0].last); // if already BTC multipply by 1
      let tot_btc = Math.round(btc*1000)/1000;
      let tot_usd = Math.round(btc * data.BTC.bitstamp.last);
      pos.totBtc.value = tot_btc;
      pos.totBtc.cell = ftd(tot_btc, 'right');
      pos.totUsd.value = tot_usd;
      pos.totUsd.cell = ftd(tot_usd, 'right');
      return {btc: tot_btc, usd: tot_usd, pos.pos};
   };

   var ftd = function(html, align, digits) {
      if(typeof align==='undefined' ){
         align = 'left';
      }
      if(typeof digits==='undefined'){
         digits = 0;
      }
      var td = document.createElement('td');
      if (typeof html === 'number') html = html.toLocaleString('de-CH-1996', {minimumFractionDigits:digits});
      if(typeof html === 'object') {
         td.appendChild(html);
      } else if(typeof html === 'undefined') {
         td.innerHTML = '';
      } else {
         td.innerHTML = html;
      }
      td.style.textAlign = align;
      td.style.cursor = 'pointer';
      td.onmousedown = function(){return false};
      td.ondblclick = function(){
         console.log(this.innerHTML);
      };
      return td;
   };

   var getLatestRate = function(aid, cid) {
      for (let i in rates) {
         if (rates[i].aid === aid && rates[i].cid === cid) {
            return rates[i];
         }
      }
      return null;
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