(function(){


   document.addEventListener('DOMContentLoaded', function() {
      //Filter einblenden
      var body = document.getElementsByTagName("BODY")[0];
      body.style.padding = '10px';

      // Load Positions
      var request = new XMLHttpRequest();
      request.open('GET', '/positions', true);
      request.onload = function() {
         if(request.status >= 200 && request.status < 400) {
            var data = JSON.parse(request.responseText);
            body.appendChild(btable(data));
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

   // Spalten ind er Reihenfolge der Darstellung
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
      t.className = 'table-striped';
      t.width = '100%';
      t.maxWidth = '1000px';
      var thead = document.createElement('thead');
      var tr = document.createElement('tr');
      var th;
      for (let c in columns) {
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
      let lastRow = new columns();
      tr = document.createElement('tr');
      for (let i in lastRow) {lastRow[i] = ftd('');}
      lastRow['Tot BTC'] = ftd(tot.btc);
      lastRow['Tot USD'] = ftd(tot.usd);
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
      cols.open = ftd(position.open, 'right');
      cols.last = ftd(position.rates[0].last, 'right');
      let btc = position.rates[0].last * position.amount;
      let tot_btc = Math.round(btc*1000)/1000;
      let tot_usd = Math.round(btc * 1330);
      cols['Tot BTC'] = ftd(tot_btc, 'right');
      cols['Tot USD'] = ftd(tot_usd, 'right');
      for (let i in cols) {
         tr.appendChild(cols[i]);
      }
      return {btc: tot_btc, usd: tot_usd, tr: tr};
   };

   var ftd = function(html, align) {
      if(typeof align==='undefined' ){
         align = 'left';
      }
      var td = document.createElement('td');
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