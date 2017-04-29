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
   var columns = ['Market', 'Asset', 'Pair', 'Amount', 'open', 'last', 'Tot BTC', 'Tot USD'];

   var btable = function(positions) {
      var t = document.createElement('table');
      t.className = 'table-striped';
      t.width = '100%';
      t.maxWidth = '1000px';
      var thead = document.createElement('thead');
      var tr = document.createElement('tr');
      var th;
      for (var c in columns) {
         th = document.createElement('th');
         th.innerHTML = columns[c];
         tr.appendChild(th);
      }
      thead.appendChild(tr);
      t.appendChild(thead);
      var tbody = document.createElement('tbody');
      for (let i in positions) {
         tbody.appendChild(positionsRow(positions[i]));
      }
      t.appendChild(tbody);
      return t;
   };

   var positionsRow = function(position) {
      var cols = {};
      for (var i in columns) {
         cols[columns[i]] = {};
      }
      var tr = document.createElement('tr');
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
      cols.Market = ftd(position.name);
      cols.Asset = ftd(position.counter);
      cols.Pair = ftd(position.base + '_' + position.counter);
      cols.Amount = ftd(position.amount, 'right');
      cols.open = ftd(position.open, 'right');
      cols.last = ftd(position.rates[0].last, 'right');
      let btc = position.rates[0].last * position.amount;
      cols['Tot BTC'] = ftd(Math.round(btc*1000)/1000, 'right');
      cols['Tot USD'] = ftd(Math.round(btc * 1330), 'right');
      for (var i in cols) {
         tr.appendChild(cols[i]);
      }
      return tr;
   };
})();