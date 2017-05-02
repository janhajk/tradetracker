(function(){

   var data = {};
   document.addEventListener('DOMContentLoaded', function() {
      // Load Positions
      var request = new XMLHttpRequest();
      request.open('GET', '/positions', true);
      request.onload = function() {
         if(request.status >= 200 && request.status < 400) {
            data = JSON.parse(request.responseText);
            var content = document.getElementById('content');
            content.innerHTML = '';
            content.appendChild(btable(data.positions));
            console.log(data);
         } else {
            // Error
         }
      };
      request.onerror = function() {
         // There was a connection error of some sort
         console.log('There was an error in xmlHttpRequest!');
      };
      request.send();
   });

   // Spalten in der Reihenfolge der Darstellung
   var columns = function() {
      return {
         Market: {},
         Asset: {},
         Pair: {},
         Amount: {},
         open: {},
         last: {},
         'Tot BTC': {},
         'Tot USD': {}
      };
   };

   var btable = function(positions) {
      var t = document.createElement('table');
      t.className = 'table-bordered table-hover';
      t.style.width = '100%';
      t.style.maxWidth = '1000px';
      var thead = document.createElement('thead');
      var tr = document.createElement('tr');
      var th;
      for (let c in new columns()) {
         th = document.createElement('th');
         th.innerHTML = c;
         tr.appendChild(th);
      }
      thead.appendChild(tr);
      t.appendChild(thead);
      var tbody = document.createElement('tbody');
      let tot = {btc:0, usd:0};
      for (let i in positions) {
         let row = positionsRow(positions[i]);
         tot.btc += row.btc;
         tot.usd += row.usd;
         tbody.appendChild(row.tr);
      }
      // Total Row
      let lastRow = new columns();
      tr = document.createElement('tr');
      for (let i in lastRow) {lastRow[i] = ftd('');}
      lastRow['Tot BTC'] = ftd(Math.round(tot.btc*100)/100, 'right');
      lastRow['Tot USD'] = ftd(tot.usd, 'right');
      lastRow.Market = ftd('Total');
      for (let i in lastRow) {
         tr.appendChild(lastRow[i]);
      }
      tbody.appendChild(tr);
      t.appendChild(tbody);
      return t;
   };

   var positionsRow = function(position) {
      var cols = new columns();
      var tr = document.createElement('tr');
      cols.Market = ftd(position.name);
      cols.Asset = ftd(position.counter);
      cols.Pair = ftd(position.base + '_' + position.counter);
      cols.Amount = ftd(position.amount, 'right');
      cols.open = ftd(position.open, 'right', position.open<10?8:0);
      cols.last = ftd(position.rates[0].last, 'right', position.rates[0].last<10?8:0);
      let btc = position.amount * (position.counter==='BTC'?1:position.rates[0].last);
      let tot_btc = Math.round(btc*1000)/1000;
      let tot_usd = Math.round(btc * data.BTC.bitstamp.last);
      cols['Tot BTC'] = ftd(tot_btc, 'right');
      cols['Tot USD'] = ftd(tot_usd, 'right');
      for (let i in cols) {
         tr.appendChild(cols[i]);
      }
      return {btc: tot_btc, usd: tot_usd, tr: tr};
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
      return td;
   };
})();