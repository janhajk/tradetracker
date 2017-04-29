(function(){

   // Spalten ind er Reihenfolge der Darstellung
   var columns = ['Name', 'Titel', 'Views'];


   document.addEventListener('DOMContentLoaded', function() {
      //Filter einblenden
      var body = document.getElementsByTagName("BODY")[0];
      body.style.maxWidth = '600px';
      body.style.padding = '10px';

      // Load Positions
      var request = new XMLHttpRequest();
      request.open('GET', '/positions', true);
      request.onload = function() {
         if(request.status >= 200 && request.status < 400) {
            var data = JSON.parse(request.responseText);
            var positions = {};
            for(let i in data) {
            }
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
})();