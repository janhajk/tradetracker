(function(){

   var data = {};
   var rates = [];
   var positions = [];
   var btc = 0;
   var cols = ['btc', 'market', 'asset', 'amount', 'open', 'last', 'totBtc', 'totUsd'];
   var rInterval = 10; // Update interval of rates in seconds
   document.addEventListener('DOMContentLoaded', function() {
      // Load Positions
      var request = new XMLHttpRequest();
      request.open('GET', '/position', true);
      request.onload = function() {
         if(request.status >= 200 && request.status < 400) {
            data = JSON.parse(request.responseText);
            for (let i in data.positions) {
               positions.push(new Position(data.positions[i]));
            }
            btc = data.BTC.bitstamp.last;
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
      this.values = position;
      this.aid = position.aid;
      this.last = position.rates[0].last;
      var self = this;
      this.update = setInterval(function(){
         for(let i=0;i<rates.length;i++) {
            if(rates[i].aid === position.aid && rates[i].cid === position.cid) {
               self.last = rates[i].last;
               break;
            }
         }
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
      var cell = function(title, pos){
         this.title = title;
         this.col = 0;
         this.value = null;
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
            let html = parent.value;
            if (typeof html === 'number') {
               let digits = (html<10)?8:0;
               html = html.toLocaleString('de-CH-1996', {minimumFractionDigits:digits});
               parent.align = 'right';
               return html;
            }
            else {
               return parent.value;
            }
         };
         this.align = 'left';
         this.formula = null;
         this.pos = 0;
         this.visible = true;
         this.rw = false;
         this.html = '';
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
         this.row[cols[i]] = new cell(cols[i], this);
      }
      this.row.market.col = 'name';
      this.row.asset.col = 'counter';
      this.row.amount.col = 'amount';
      this.row.open.col = 'open';
      this.row.totBtc.formula = function(parent, pos){
         parent.value = (pos.values.counter=='USD')?parent.amount:pos.last * pos.amount;
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
            cells.push(parent.row[cell].dom);
         }
         let tr = document.createElement('tr');
         for (let i in cells) {
            tr.appendChild(cells[i]);
         }
         return tr;
      };
      this.dom = this.tr(this);
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