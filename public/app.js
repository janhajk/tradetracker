(function(){

    var rInterval = 10; // Update interval of rates in seconds

    Highcharts.setOptions({
        global: {
            timezone: 'Europe/Oslo'
        }
    });

    var rates = {};
    var positions = [];
    var btc = 0;
    var ltc = 0;
    var bar = null;
    var pieTotBtc = null;
    var pieTotMarket = null;
    var chartsDom = null;
    var btnLogin;
    var firstRun = true;
    var history = null;

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
            formula: function(p, pp) {
                p.value = pp.name.market;
            },
            image: {folder:'markets', filetype: 'png'},
            align: 'center'
        },
        'asset': {
            formula: function(p, pp) {
                p.value = pp.name.assetname;
            },
            image: {folder:'coins/32x32', filetype: 'png'},
            align: 'center'
        },
        'amount': {
            col: 'amount',
            class: 'hidden-xs',
            align: 'right'
        },
        'open': {
            formula: function(p, pp) {
                p.value = pp.stats.open.rate;
            },
            class: 'hidden-xs hidden-sm',
            align: 'right'
        },
        'last': {
            formula: function(p, pp) {
                p.value = pp.last;
            },
            align: 'right'
        },
        'totBtc': {
            formula : function(p, pp){
                p.value = pp.stats.totals.btc;
            },
            round: 2,
            sort: 'desc'
        },
        'totUsd': {
            formula : function(p, pp){
                p.value = pp.stats.totals.usd;
            },
            round: 0
        },
        '±B/1h': {
            formula: function(p, pp) {
                var request = new XMLHttpRequest();
                request.open('GET', '/asset/'+pp.aid+'/historical/'+pp.cid+'/3600', true);
                request.onload = function() {
                    if(request.status >= 200 && request.status < 400) {
                        try {
                            var l = (JSON.parse(request.responseText)).v;
                            pp.rates[0].last_1h = l;
                            p.value = (l===undefined)?0:(pp.last/l-1) * 100;
                        } catch(e) {
                            console.log(e);
                        }
                    }
                    else { // different status than 200-400
                    }
                };
                request.onerror = function() {
                    console.log('There was an error in xmlHttpRequest!');
                };
                request.send();
            },
            round: 1,
            prefix: 'sign',
            alert: function(p, pp) {
                
            }
        },
        '±B/24h': {
            formula: function(p, pp) {
                var request = new XMLHttpRequest();
                request.open('GET', '/asset/'+pp.aid+'/historical/'+pp.cid+'/86400', true);
                request.onload = function() {
                    if(request.status >= 200 && request.status < 400) {
                        try {
                            var l = (JSON.parse(request.responseText)).v;
                            pp.rates[0].last_24h = l;
                            p.value = (l===undefined)?0:(pp.last/l-1) * 100;
                        } catch(e) {
                            console.log(e);
                        }
                    }
                    else { // different status than 200-400
                    }
                };
                request.onerror = function() {
                    console.log('There was an error in xmlHttpRequest!');
                };
                request.send();
            },
            round: 1,
            prefix: 'sign'
        },
    };

    var labels = {
        btc: 0,
        usd: 0
    };


    var Login = function() {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.style.clear = 'both';
        btn.style.float = 'right';
        btn.className = 'btn btn-xs';
        btn.innerHTML = 'Login';
        btn.style.display = 'none';
        btn.style.display = 'none';
        btn.onclick = function() {
            window.location = '/auth/google';
        };
        this.btn = btn;
        this.btn = btn;
        document.getElementById('dashline').appendChild(btn);
    };
    Login.prototype.show = function() {
        this.btn.style.display = 'block';
    };
    Login.prototype.hide = function() {
        this.btn.style.display = 'none';
    };

    /**
    * Countdown Progressbar
    * displays time since last update
    */
    var Countdown = function() {
        var lastUpdate = 0;
        var interval = 1; // in seconds
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
                bar.className = 'progress-bar progress-bar-'+((newState > level[0])?'success':(newState > level[1])?'warning':'danger');
                bar.style.width = newState + '%';
            }, interval*1000);
        };
    };

    /**
    * document Loaded listener
    */
    document.addEventListener('DOMContentLoaded', function() {
        bar = new Countdown();
        btnLogin = new Login();
        btnLogin = new Login();
        // Load Positions
        var request = new XMLHttpRequest();
        request.open('GET', '/position', true);
        request.onload = function() {
            if(request.status >= 200 && request.status < 400) {
                try {
                    var data = JSON.parse(request.responseText);
                    btc = data.BTC.bitstamp.last;
                    ltc = data.LTC.poloniex.last;
                    for (let i in data.positions) {
                        let position = new Position(data.positions[i]);
                        rates[data.positions[i].aid + '_' + data.positions[i].cid] = {
                            aid: data.positions[i].aid,
                            cid: data.positions[i].cid,
                            last: data.positions[i].last
                        };
                        position.load();
                        positions.push(position);
                    }
                    var table = new Postable(positions);
                    var content = document.getElementById('content');
                    content.innerHTML = '';
                    content.appendChild(table.render());
                    $.bootstrapSortable({ applyLast: true });
                    bar.start();
                    updateRates();
                    chartsDom = new ChartsDom(content);
                    pieTotBtc = new TotAssetChart(chartsDom.row[0]);
                    pieTotMarket = new TotMarketChart(chartsDom.row[1]);
                    history = new History(function(e, self){
                        self.appendChart('main', chartsDom.row[2]);
                    });
                    if (!labels.btc) {
                        let dashline = document.getElementById('dashline');
                        labels.btc = document.createElement('span');
                        labels.btc.className = 'label label-success';
                        dashline.appendChild(labels.btc);
                    }
                    if (!labels.usd) {
                        let dashline = document.getElementById('dashline');
                        labels.usd = document.createElement('span');
                        labels.usd.className = 'label label-primary';
                        dashline.appendChild(labels.usd);
                    }
                    let tot = tGetTot();
                    labels.btc.innerHTML = 'Tot BTC: ' + tot.btc;
                    labels.usd.innerHTML = 'Tot USD: ' + tot.usd;
                }
                catch (e) {
                    console.log(e);
                    console.log(new Date().toLocaleString() + ': not logged in');
                    btnLogin.show();
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

        /**
         * Update Rates
         *
         */
        var updateRates = function() {
            let request = new XMLHttpRequest();
            request.open('GET', '/rates', true);
            request.onload = function() {
                if(request.status >= 200 && request.status < 400) {
                    try {
                        let r = JSON.parse(request.responseText);
                        btnLogin.hide();
                        btnLogin.hide();
                        for (let i=0;i<r.length;i++) {
                            rates[r[i].aid + '_' + r[i].cid] = r[i];
                        }
                        // update Global BTC-Price
                        btc = getLatestRate(110,12).last;
                        ltc = getLatestRate(25,1).last;
                        let tot = tGetTot();
                        document.title = tot.btc + '/' + tot.usd;
                        for (let i in positions) {
                            positions[i].update();
                        }
                        labels.btc.innerHTML = 'Tot BTC: ' + tot.btc;
                        labels.usd.innerHTML = 'Tot USD: ' + tot.usd;
                        bar.update();
                        pieTotBtc.update();
                        pieTotMarket.update();
                        let t = getTot();
                        history.update({usd:t.usd, btc:t.btc});
                        // set updateRates as interval
                        if(firstRun) {
                            setInterval(updateRates, rInterval * 1000);
                            firstRun = false;
                        }
                    }
                    catch (e) {
                        console.log(e);
                        btnLogin.show();
                    }
                } else {
                    // Error
                    console.log('There was an Error when updating rates;');
                }
            };
            request.onerror = function() {
                console.log('There was an error in xmlHttpRequest!');
            };
            request.send();
        };

        // Keyboard Shortkeys
        window.addEventListener('keypress', function(e){
            var keyCode = e.key;
            console.log(keyCode);
            if (keyCode === 'h') {
                modal_history();
            }
            // 43 = +
            // 45 = -
        }, false);
    });


    /**
    * Browser notifications
    */
    document.addEventListener('DOMContentLoaded', function () {
        if (Notification.permission !== 'granted')
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
    };

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
                table[1].tBodies[0].appendChild(positions[i].dom());
                positions[i].update();
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
        this.row = [col1, col2, col3];
    };


    /**
    * Position Object
    *
    * @param {Object} data position-data from Database JSON
    *
    */
    var Position = function(data) {
        this.amount = Number(data.amount);
        this.open   = Number(data.open);
        this.cid    = Number(data.cid);
        this.aid    = Number(data.aid);
        this.type   = Number(data.tid);
        this.rates  = data.rates;
        this.last   = Number(data.rates[0].last);
        this.name = {
            market: data.name,
            assetname: data.assetname,
            pair: data.base + '/' + data.counter,
            base: data.base,
            counter: data.counter
        };
        this.stats = {
            totals: {
                btc: 0,
                usd: 0
            },
            open: {
                timestamp: 0,
                rate: Number(data.open)
            },
            close: {
                timestamp: 0,
                rate: Number(data.open)
            }
        };
        this.style = {}; // For future purposes
        // create cell for each col and update
        this.row = {};
    };

    Position.prototype.load = function() {
        for (let i in cols) {
            let c = new Cell(i, cols[i], this);  // function Cell(title, defaults, pos)
            this.row[i] = c;
        }
        this.updateTotal();
    };

    /**
     * updates Total BTC & USD for Position
     */
    Position.prototype.updateTotal = function(){
        // BTC
        if (this.name.base === 'BTC' && (this.name.counter).substring(0,3) !== 'USD') {
           this.stats.totals.btc = this.last * this.amount;
        }
       else if (this.name.base === 'USD' && this.name.counter === 'USD') {
          this.stats.totals.btc = 1 / btc * this.amount;
       }
       else if ((this.name.counter).substring(0,3) == 'USD') {
          this.stats.totals.btc = this.amount * this.last / btc;
       }
       else if (this.name.base === 'LTC' && this.name.counter === 'OKEX') {
          this.stats.totals.btc = this.last * ltc;
       }
       else {
          this.stats.totals.btc = this.amount;
       }
        // USD
        this.stats.totals.usd = this.stats.totals.btc * btc;
    };

    /**
     * Update position and all cells in position
     * using latest rates
     */
    Position.prototype.update = function(){
        var lRate = getLatestRate(this.aid, this.cid);
        if (lRate) {
            this.last = lRate.last;
            this.rates.unshift(lRate);
            if (this.rates.length > 3600) this.rates.pop();
        }
        this.updateTotal();
        for (let cell in this.row) {
            this.row[cell].update();
        }
    };

    /**
    * Renders DOM of a row
    * returns DOM-<tr>
    */
    Position.prototype.dom = function(){
        let cells = [];
        for (let cell in this.row) {
            if (!this.row[cell].hidden) {
                cells.push(this.row[cell].dom);
            }
        }
        let tr = document.createElement('tr');
        for (let i in cells) {
            tr.appendChild(cells[i]);
        }
        return tr;
    };

    /**
    * Cell Object
    *
    * @param {String} title
    * @param {Array} defaults
    * @param {Object} pos parent > position of which cell is part of
    *
    */
    var Cell = function(title, defaults, pos){
        this.position = pos;
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
        this.dom = document.createElement('td');
        this.calc();
        this.render();
    };

    /**
     * Renders Cell the first time
     * only called once
     */
    Cell.prototype.render =  function() {
        var td = this.dom;
        // Image-Cells
        if (this.value !== null && this.image) {
            td.innerHTML = '';
            let value = this.value.replace(/\s/g, '-').toLowerCase();
            let path = 'images/' + this.image.folder + '/';
            let src = path + value + '.' + this.image.filetype;
            td.style.backgroundImage = 'url('+src+')';
            td.style.backgroundRepeat = 'no-repeat';
            td.style.backgroundSize = 'Auto 25px';
            td.title = this.value;
            td.style.backgroundPosition = this.align;
            //img.title = self.tValue(this);
        }
        // Text-Cells
        else {
            td.innerHTML = this.tValue();
        }
        td.style.textAlign = this.align;
        td.style.cursor = 'pointer';
        td.className = this.class;
        td.onmousedown = function(){return false;};
        // For Testing purpose
        td.ondblclick = function(){
            console.log(this.value);
        };
    };

    /**
    * Calculates cell using formula
    */
    Cell.prototype.calc = function() {
        if (this.col) {
            this.value = this.position[this.col];
        }
        if (this.formula !== null) {
            if (typeof this.formula === 'function') {
                this.formula(this, this.position);
            }
            else if (this.formula.type === '*') {
                this.value = this.position.row[this.formula.x].value * this.position.row[this.formula.y].value;
            }
        }
    };

    /**
    * Formats a Cell Value to readable format
    */
    Cell.prototype.tValue = function() {
        var html = this.value;
        if (typeof html === 'number') {
            this.dom.style.textAlign = 'right';
        }
        if (this.round === -1) {
            if (typeof html === 'number') {
                let digits = smartRound(html);
                //html = cutTrailingZeros(html.toLocaleString('de-CH-1996', {minimumFractionDigits:digits}));
                html = html.toLocaleString('de-CH-1996', {minimumFractionDigits:digits});
            }
        }
        else if (typeof html === 'number' && this.round > -1) {
            var num = html;
            html = html.toFixed(this.round);
            html = Number(html).toLocaleString('de-CH-1996', {minimumFractionDigits:this.round});
            if (this.prefix === 'sign' && num > 0) html = '+' + html;
        }
        return html;
    };

    /**
    * Updates Cell (only if value has changed)
    */
    Cell.prototype.update = function() {
        var val1 = this.value;
        this.calc();
        this.dom.dataValue = this.value;
        // update html if value has changed
        if (val1 === null || this.value !== val1) {
            this.dom.innerHTML = this.tValue();
            if (typeof this.value === 'number' && Math.abs(this.value/val1-1)>0.003) {
                this.dom.style.transition = 'color 1s';
                if (this.value > val1) {
                    this.dom.style.backgroundColor = '#ccffcc';
                }
                else if (this.value < val1) {
                    this.dom.style.backgroundColor = '#ff9999';
                }
                var dom = this.dom;
                setTimeout(function(){
                    dom.style.transition = 'backgroundColor 4s';
                    dom.style.backgroundColor = 'transparent';
                }, 2500);
            }
        }
    };

    // *** END Cell


    /**
    * Positions-Table
    * Creates empty positions table
    * Data-rows are added asynchronously
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
            if (cols[c].sort) {
                th.dataDefaultsort=cols[c].sort;
            }
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
            tot.btc += positions[i].stats.totals.btc;
            tot.usd += positions[i].stats.totals.usd;
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
            var assetname = positions[i].name.assetname;
            if (positions[i].name.base === 'BTC' && inArray(positions[i].name.counter, BTC)) assetname = 'Bitcoin';
            if (positions[i].name.base === 'LTC' && inArray(positions[i].name.counter, BTC)) assetname = 'Litecoin';
            if (!(assetname in tot)) {
                tot[assetname] = {btc:0,usd:0};
            }
            tot[assetname].btc += positions[i].stats.totals.btc;
            tot[assetname].usd += positions[i].stats.totals.usd;
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
            tot[market].btc += positions[i].stats.totals.btc;
            tot[market].usd += positions[i].stats.totals.usd;
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
    * Creates empty LineChart Object
    * and appends to parent-DOM
    *
    */
    var emptyLineChart = function(parent) {
     var canvas = document.createElement('canvas');
     canvas.width = '400';
     canvas.height = '400';
     canvas.style.width = '400px';
     canvas.style.height = '400px';
     parent.appendChild(canvas);
     var ctx = canvas.getContext('2d');
     var chart = new Chart(ctx, {
         type: 'line',
         data: {
             datasets: [{
                 data: []
             }]
         },
         options: {
             scales: {
                 xAxes: [{
                     type: 'time',
                     time: {
                         unit: 'day'
                     }
                 }]
             },
             elements: {
                 line: {
                     tension: 0, // disables bezier curves
                 }
             }
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
    * Get latest Rate-Object for Asset for specific connector
    *
    * @param  {Number} aid Asset-ID
    * @param  {Number} cid Connector-ID
    * @return {Number} The latest rate; 0 if no rate found
    */
    var getLatestRate = function(aid, cid) {
        var best = rates[aid + '_' + cid];
        if (best !== undefined && best.last !== undefined) {
            return best;
        }
        for(let i in rates) {
            // if not exact rate found
            // try to get any rate for aid
            // even not for same cid
            if (rates[i].aid === aid && rates[i].last !== undefined) {
                return rates[i];
            }
        }
        return false;
    };

    var History = function(callback) {
        this.data = {
            usd: [],
            btc: []
        };
        this.request(callback);
        this.charts = {};
    };

    History.prototype.appendChart = function(name, parent) {
        var div = document.createElement('div');
        parent.appendChild(div);

        var c = Highcharts.stockChart(div, {
            yAxis: {
                crosshair: true
            },
            rangeSelector: {
                buttons: [{
                    type: 'hour',
                    count: 1,
                    text: '1h'
                }, {
                    type: 'day',
                    count: 1,
                    text: '24h'
                }, {
                    type: 'day',
                    count: 7,
                    text: '1w'
                }, {
                    type: 'month',
                    count: 6,
                    text: '6m'
                }, {
                    type: 'ytd',
                    text: 'YTD'
                }, {
                    type: 'year',
                    count: 1,
                    text: '1y'
                }, {
                    type: 'all',
                    text: 'All'
                }],
                selected: 2
            },
            title: {
                text: 'History'
            },
            series: [{
                name: 'Total USD',
                data: this.data.usd
            }]
        });
        this.charts[name] = c;
    };

    History.prototype.update = function(newData) {
        this.data.usd.push(newData.usd);
        this.data.btc.push(newData.btc);
        var timestamp = Date.now();
        for (let i in this.charts) {
            if (this.charts[i] != undefined) {
                this.charts[i].series[0].addPoint([timestamp, newData.usd], false, false, false);
                //this.charts[i].series[1].addPoint([Date.now(), newData.btc], false);
                this.charts[i].redraw();
            }
        }
    };

    History.prototype.request = function(callback) {
        var self = this;
        var request = new XMLHttpRequest();
        request.open('GET', '/history', true);
        request.onload = function() {
            if(request.status >= 200 && request.status < 400) {
                try {
                    var d = JSON.parse(request.responseText);
                    for (let i=0;i<d.length;i++) {
                        self.data.usd.push([d[i].timestamp*1000, d[i].dollar]);
                        self.data.btc.push([d[i].timestamp*1000, d[i].btc]);
                    }
                    callback(null, self);
                }
                catch (e) {
                    console.log(e);
                    console.log(new Date().toLocaleString() + ': not logged in');
                    btnLogin.show();
                    callback(e);
                }
            } else {
                // Error
                callback(e);
            }
        };
        request.onerror = function(e) {
            console.log('There was an error in xmlHttpRequest!');
            callback(e);
        };
        request.send();
    };

    History.prototype.remove = function(name) {
        delete this.charts[name];
    };

    var modal_history = function(){
        var modal = new BModal('History');
        var body = document.getElementsByTagName("BODY")[0];
        body.appendChild(modal.dom);
        history.appendChart('modal', modal.content);
        $(modal.dom).modal();
        $(modal.dom).on('hidden.bs.modal', function () {
            history.remove('modal');
        });
    };

    var BModal = function(title) {
        var modal = document.createElement('div');
        modal.className = 'modal';
        modal.role = 'dialog';
        var dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        dialog.style.width = '100%';
        //dialog.style.height = '80%';
        //dialog.style.margin = '0';
        //dialog.style.padding = '0';
        var content = document.createElement('div');
        content.className = 'modal-content';
        //content.style.height = 'auto';
        //content.style.minHeight = '100%';
        //content.style.borderRadius = '0';
        var header = document.createElement('div');
        header.className = 'modal-header';
        var close = document.createElement('button');
        close.className = 'close';
        close.dataDismiss = 'modal';
        close.innerHTML = '&times;';
        var dTitle = document.createElement('h4');
        dTitle.className = 'modal-title';
        dTitle.innerHTML = title;
        var body = document.createElement('div');
        body.className = 'modal-body';
        var footer = document.createElement('div');
        footer.className = 'modal-footer';
        var close2 = document.createElement('button');
        close2.className = 'btn btn-default';
        close2.dataDismiss = 'modal';
        close2.innerHTML = 'Close';
        header.appendChild(close);
        header.appendChild(dTitle);
        footer.appendChild(close2);
        content.appendChild(header);
        content.appendChild(body);
        content.appendChild(footer);
        dialog.appendChild(content);
        modal.appendChild(dialog);
        this.dom = modal;
        this.content = body;
    };





    //
    // Helper Functions
    //
    //
    //
    //
    //


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
        var newNumber = number;
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
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        var colour = '#';
        for (let i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 0xFF;
            colour += ('00' + value.toString(16)).substr(-2);
        }
        return colour;
    };

})();