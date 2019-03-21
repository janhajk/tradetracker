(function() {

    var rInterval = 10; // Update interval of rates in seconds

    // Set global options for highchart
    Highcharts.setOptions({
        global: {
            timezone: 'Europe/Oslo'
        }
    });

    // Variables
    var rates = {};
    var assetDetail;
    var postable;
    var btc = 0;
    var ltc = 0;
    var bar = null;
    var pieTotBtc = null;
    var pieTotMarket = null;
    var chartsDom = null;
    var btnLogin;
    var firstRun = true;
    var history = null;
    var positionCollection = {};

    var socket = io();


    /////////////////////////////////////////
    // Main Table
    // Table Columns / Structure
    // p  = parent        = cell
    // pp = parent-parent = position
    var cols = {
        'btc': {
            hidden: true,
            formula: function(cell, position, cb) {
                cell.value = btc;
                cb();
            }
        },
        'market': {
            formula: function(cell, position, cb) {
                cell.value = position.name.market;
                cb();
            },
            image: { folder: 'markets', filetype: 'png' },
            align: 'center'
        },
        'asset': {
            formula: function(cell, position, cb) {
                cell.value = position.name.assetname;
                cb();
            },
            image: { folder: 'coins/32x32', filetype: 'png' },
            align: 'center'
        },
        'amount': {
            col: 'amount',
            class: 'hidden-xs',
            align: 'right'
        },
        'open': {
            formula: function(cell, position, cb) {
                cell.value = position.stats.open.rate;
                cb();
            },
            class: 'hidden-xs hidden-sm',
            align: 'right'
        },
        'last': {
            formula: function(p, pp, cb) {
                p.value = pp.last;
                cb();
            },
            align: 'right',
            onclick: function(pp) {
                return function() {
                    pp.detailsToggle();
                };
            }
        },
        'totBtc': {
            formula: function(cell, position, cb) {
                cell.value = position.stats.totals.btc;
                cb();
            },
            round: 2,
            sort: 'desc'
        },
        'totUsd': {
            formula: function(cell, position, cb) {
                cell.value = position.stats.totals.usd;
                cb();
            },
            round: 0
        },
        '±B/1h': {
            formula: function(cell, position, cb) {
                assetGetChange(3600, cell, position, cb);
            },
            round: 1,
            prefix: 'sign',
            alert: function(p, pp) {}
        },
        '±B/24h': {
            formula: function(cell, position, cb) {
                assetGetChange(86400, cell, position, cb);
            },
            round: 1,
            prefix: 'sign'
        }
    };

    // Bubble Labels on top Navbar
    var labels = {};


    /**
     * 
     * Login Form in Navbar
     * 
     * 
     * 
     */
    var Login = function() {
        var div = document.createElement('div');
        var form = document.createElement('form');
        form.action = "/login";
        form.method = "POST";
        var username = document.createElement('input');
        username.type = "text";
        username.name = "username";
        var password = document.createElement('input');
        password.type = "password";
        password.name = "password";
        var submit = document.createElement('input');
        submit.type = "submit";
        submit.value = "Login";
        form.appendChild(username);
        form.appendChild(password);
        form.appendChild(username);
        form.appendChild(password);
        form.appendChild(submit);
        div.appendChild(form);
        document.getElementById('dashline').appendChild(div);
        this.div = div;
        div.style.display = 'none';

        this.show = function() {
            this.div.style.display = 'block';
        };
        this.hide = function() {
            this.div.style.display = 'none';
        };
    };

    /**
     * 
     * Countdown Progressbar Object
     * 
     * Displays time since last update
     * 
     * uses Bootstrap progress
     * see: https://getbootstrap.com/docs/4.0/components/progress/
     * 
     */
    var Countdown = function() {
        // Settings
        var interval = 1; // in seconds
        var dashline = document.getElementById('dashline');
        var bHeight = 5; // Height of Progressbar in px
        var bWidth = 100; // Width of Progressbar in px
        var types = {
            green: 'success',
            yellow: 'warning',
            blue: 'info',
            red: 'danger'
        };

        // Progressbar Cointainer
        var container = document.createElement('div');
        container.className = 'progress';
        container.style.float = 'right';
        container.style.marginTop = '2px';
        container.style.height = bHeight + 'px';
        container.style.width = bWidth + 'px';

        // Progressbar Progressline
        var bar = document.createElement('div');
        bar.className = 'progress-bar progress-bar-' + types['red']; // initial value
        bar.role = 'progressbar';
        bar.style.width = '10%';

        container.appendChild(bar);
        dashline.appendChild(container);

        this.bar = bar;

        // Resets the progress bar to 100%
        this.reset = function() {
            this.bar.style.width = '100%';
        };

        // Starts the progressbar countdown
        // Progressbar goes to 0
        // it is reset via reset() from external trigger
        this.start = function() {
            setInterval(function() {
                let level = [40, 20];
                let resetAt = 40;
                let min = 10;
                let state = bar.style.width;
                state = Number(state.replace(/[^0-9]/gi, ''));
                let step = (100 - resetAt) / (rInterval / interval);
                let newState = state - step;
                if (newState <= min) { newState = min; }
                bar.className = 'progress-bar progress-bar-' + ((newState > level[0]) ? types['green'] : (newState > level[1]) ? types['yellow'] : types['red']);
                bar.style.width = newState + '%';
            }, interval * 1000);
        };
    };

    /**
     * 
     * Bubble-Labels in Navbar
     * 
     * see: http://getbootstrap.com/2.3.2/components.html#labels-badges
     * 
     * 
     */

    var NavBubble = function(title, type, parent, color) {
        var colors = {
            gray: '',
            green: '-success',
            orange: '-warning',
            red: '-important',
            blue: '-info',
            black: '-inverse'
        };
        var label = document.createElement('span');
        label.className = 'label label' + colors[color];
        label.innerHTML = title;
        parent.appendChild(label);

        this.type = type;
        this.title = title;
        this.label = label;
        this.parent = parent;

        this.update = function(value) {
            if (this.type === 'number') {
                this.number = value;
                this.label.innerHTML = this.title + ' ' + value;
            }
            else {
                this.label.innerHTML = value;
            }
        };
    };

    /**
     * 
     * Socket-Interaction with Host
     * 
     * 
     * 
     * 
     * 
     */
    (function() {
        socket.on('rates', function(msg) {
            // ...
        });
        socket.on('history', function(msg) {
            // ...
        });
        socket.on('position', function(msg) {
            // ...
        });
        // For sending to socket
        // socket.emit('chat message', $('#m').val());
        //   $('#m').val('');
    })();

    /**
     * 
     * document Loaded listener
     * 
     * this executes on DocumentLoaded
     * 
     * 
     */
    document.addEventListener('DOMContentLoaded', function() {

        // Create Navigation Objects
        bar = new Countdown();
        btnLogin = new Login();
        btnLogin.show();
        labels['btc'] = new NavBubble('Tot BTC:', 'number', document.getElementById('dashline'), 'green');
        labels['usd'] = new NavBubble('Tot USD:', 'number', document.getElementById('dashline'), 'blue');

        var content = document.getElementById('content');

        // Init positions collection
        positionCollection = new PositionCollection(content);

        /**
         * 
         * Load initial Data
         * 
         * This function only gets called once
         * 
         * 
         */
        var request = new XMLHttpRequest();
        request.open('GET', '/position', true);
        request.onload = function() {
            if (request.status === 200) {
                try {
                    var data = JSON.parse(request.responseText);
                    btc = data.BTC.bitstamp.last;
                    ltc = data.LTC.poloniex.last;
                    document.getElementById('dashline').removeChild(btnLogin.div);
                    for (let i in data.positions) {
                        let position = new Position(data.positions[i]);
                        rates[data.positions[i].aid + '_' + data.positions[i].cid] = {
                            aid: data.positions[i].aid,
                            cid: data.positions[i].cid,
                            last: data.positions[i].last
                        };
                        position.load();

                        // Add postition to collection
                        positionCollection.add(position);
                    }

                    // Render Postition Table
                    positionCollection.tableRender();

                    // Area to show details of an asset
                    assetDetail = document.createElement('div');
                    assetDetail.style.display = 'none';
                    content.appendChild(assetDetail);

                    // Start Progressbar
                    bar.start();

                    // Create Charts
                    chartsDom = new ChartsDom(content);
                    pieTotBtc = new TotAssetChart(chartsDom.row[0]);
                    pieTotMarket = new TotMarketChart(chartsDom.row[1]);

                    // Create Historical Chart
                    history = new History(function(e, self) {
                        self.appendChart('main', chartsDom.row[2]);

                        // Start new Update Process once everything is loaded
                        updateRates();
                    });

                    // Update Labels
                    labels.btc.update(positionCollection.getTot('btc', true));
                    labels.usd.update(positionCollection.getTot('usd', true));

                }
                catch (e) {
                    console.log(e);
                    console.log(new Date().toLocaleString() + ': not logged in');
                    btnLogin.show();
                    document.getElementById('content').innerHTML = 'Not logged in.';
                }
            }
            else {
                // Error
            }
        };
        request.onerror = function() {
            console.log('There was an error in xmlHttpRequest!');
        };
        request.send();

        /**
         * 
         * Update Rates after every rInterval
         * 
         * 
         *
         */
        var updateRates = function() {
            let request = new XMLHttpRequest();
            request.open('GET', '/rates', true);
            request.onload = function() {
                if (request.status >= 200 && request.status < 400) {
                    try {
                        var r = JSON.parse(request.responseText);
                        btnLogin.hide();
                        for (let i = 0; i < r.length; i++) {
                            rates[r[i].aid + '_' + r[i].cid] = r[i];
                        }
                        // update Global BTC-Price
                        btc = getLatestRate(110, 12).last;
                        ltc = getLatestRate(25, 1).last;

                        // go through all positions and update to latest rate
                        for (let i in positionCollection.positions) {
                            positionCollection.positions[i].update();
                        }

                        // Update Page Title and NavBubbles, Countdown
                        document.title = positionCollection.getTot('btc', true) + '/' + positionCollection.getTot('usd', true);
                        labels.btc.update(positionCollection.getTot('btc', true));
                        labels.usd.update(positionCollection.getTot('usd', true));
                        bar.reset();

                        // Update Charts
                        pieTotBtc.update();
                        pieTotMarket.update();

                        // Update History-Chart
                        history.update({
                            usd: positionCollection.getTot('usd'),
                            btc: positionCollection.getTot('btc')
                        });

                        // Start new Update Process
                        setTimeout(updateRates, rInterval * 1000);
                    }
                    // JSON.parse returns error if not logged in
                    catch (e) {
                        console.log(e);
                        btnLogin.show();
                    }
                }
                else {
                    // Status Error
                    console.log('There was an Status-Error when updating rates;');
                }
            };
            request.onerror = function() {
                console.log('There was an error in xmlHttpRequest!');
            };
            request.send();
        };

        // Keyboard Shortkeys
        window.addEventListener('keypress', function(e) {
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
    /*
    document.addEventListener('DOMContentLoaded', function () {
        if (Notification.permission !== 'granted')
            Notification.requestPermission();
    });*/
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
            notification.onclick = function() {
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
     * 
     * Positions - Collection of Position
     * 
     * 
     */
    var PositionCollection = function(parent) {

        // var that holds all positions
        this.positions = [];

        this.parent = parent;

        // Adds a Position to the collecton
        this.add = function(position) {
            this.positions.push(position);
        };

        // Renders a Position table
        this.tableRender = function() {
            var table = this.table();
            this.parent.appendChild(table[0]);
            for (let i = 0; i < this.positions.length; i++) {
                this.positions[i].domRow(table[1].tBodies[0]);
                this.positions[i].update();
            }
            $.bootstrapSortable({ applyLast: true });
        };
        /**
         * Positions-Table
         * Creates empty positions table
         * Data-rows are added asynchronously
         */
        this.table = function() {
            var t = document.createElement('table');
            t.className = ['table', 'table-bordered', 'table-hover', 'table-responsive', 'table-condensed', 'sortable'].join(' ');
            t.style.width = '100%';
            t.style.maxWidth = '1000px';

            // table header
            var thead = document.createElement('thead');
            thead.class = 'thead-inverse';
            var tr = document.createElement('tr');
            for (let c in cols) {
                if (cols[c].hidden) continue;
                let th = document.createElement('th');
                th.innerHTML = c;
                th.className = cols[c].class ? cols[c].class : '';
                th.style.textAlign = cols[c].align ? cols[c].align : 'left';
                if (cols[c].sort) {
                    th.dataDefaultsort = cols[c].sort;
                }
                tr.appendChild(th);
            }
            thead.appendChild(tr);
            t.appendChild(thead);

            // Positions Body
            var tbody = document.createElement('tbody');
            t.appendChild(tbody);

            // Table Wrapper
            var div = document.createElement('div');
            div.className = 'table-responsive';
            div.appendChild(t);
            return [div, t];
        };


        /**
         * Get Total of all positions
         * 
         * @param [string] currency The currency: 'btc' or 'usd'
         * returns 
         * 
         */
        this.getTot = function(currency, formated) {
            var tot = 0;
            for (let i = 0; i < this.positions.length; i++) {
                tot += this.positions[i].stats.totals[currency];
            }
            formated = formated || false;
            if (formated) {
                return tot.toLocaleString('de-CH-1996', { minimumFractionDigits: (currency === 'btc' ? 2 : 0) });
            }
            return tot;
        };


        /**
         * Get Total of each asset
         */
        this.getTotAsset = function() {
            var tot = {};
            var BTC = ['USD', 'OKEX', '1B'];
            for (let i in this.positions) {
                var assetname = this.positions[i].name.assetname;
                if (this.positions[i].name.base === 'BTC' && inArray(this.positions[i].name.counter, BTC)) assetname = 'Bitcoin';
                if (this.positions[i].name.base === 'LTC' && inArray(this.positions[i].name.counter, BTC)) assetname = 'Litecoin';
                if (!(assetname in tot)) {
                    tot[assetname] = { btc: 0, usd: 0 };
                }
                tot[assetname].btc += this.positions[i].stats.totals.btc;
                tot[assetname].usd += this.positions[i].stats.totals.usd;
            }
            var tottot = this.getTot('btc');
            for (let i in tot) {
                tot[i]['%'] = Math.round(tot[i].btc / tottot);
            }
            return tot;
        };


        /**
         * Get Total for every market
         */
        this.getTotMarket = function() {
            var tot = {};
            for (let i in this.positions) {
                var market = this.positions[i].row.market.value;
                if (!(market in tot)) {
                    tot[market] = { btc: 0, usd: 0 };
                }
                tot[market].btc += this.positions[i].stats.totals.btc;
                tot[market].usd += this.positions[i].stats.totals.usd;
            }
            for (let i in tot) {
                if (tot[i].btc === 0) delete tot[i];
            }
            var tottot = this.getTot('btc');
            for (let i in tot) {
                tot[i]['%'] = Math.round(tot[i].btc / tottot);
            }
            return tot;
        };
    };


    // -------------------------
    // END OF PositionCollection
    // -------------------------



    /**
     * Position Object
     *
     * @param {Object} data position-data from Database JSON
     *
     */
    var Position = function(data) {
        var self = this;
        this.amount = Number(data.amount);
        this.open = Number(data.open);
        this.cid = Number(data.cid);
        this.rateCid = this.cid;
        this.aid = Number(data.aid);
        this.type = Number(data.tid);
        this.rates = data.rates;
        this.last = Number(data.rates[0].last);
        this.lineChart = false;
        this.name = {
            market: data.name,
            assetname: data.assetname,
            pair: data.base + '/' + data.counter,
            base: data.base,
            counter: data.counter
        };

        // DOM Element of Row
        this.tr = {};
        // DOM Element of Detail-Row
        this.trDetail = {};
        // Visibility state of Detail-Row
        this.showDetails = -1;
        // Stats of Position
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

        /**
         * Create the cells for the position row
         * and update the totals
         * 
         */
        this.load = function() {
            for (let i in cols) {
                let c = new Cell(i, cols[i], this); // function Cell(title, defaults, position)
                this.row[i] = c;
            }
            updateTotal();
        };

        /**
         * 
         * updates Total BTC & USD for Position
         * 
         * 
         */
        var updateTotal = function() {
            // BTC
            if (self.name.base === 'BTC' && (self.name.counter).substring(0, 3) !== 'USD') {
                self.stats.totals.btc = self.last * self.amount;
            }
            else if (self.name.base === 'USD' && self.name.counter === 'USD') {
                self.stats.totals.btc = 1 / btc * self.amount;
            }
            else if ((self.name.counter).substring(0, 3) == 'USD') {
                self.stats.totals.btc = self.amount * self.last / btc;
            }
            else if (self.name.base === 'LTC' && self.name.counter === 'OKEX') {
                self.stats.totals.btc = self.last * ltc;
            }
            else {
                self.stats.totals.btc = self.amount;
            }
            // USD
            self.stats.totals.usd = self.stats.totals.btc * btc;
        };

        /**
         * Update position and all cells in position
         * using latest rates
         */
        this.update = function() {
            var lRate = getLatestRate(this.aid, this.cid);
            if (lRate) {
                this.last = lRate.last;
                this.rates.unshift(lRate);
                if (this.rates.length > 3600) this.rates.pop();
            }
            updateTotal();
            for (let cell in this.row) {
                this.row[cell].update();
            }
        };

        /**
         * Renders DOM of a row
         * appends to parent
         * saves in this.tr
         * returns the DOM-<tr>
         */
        this.domRow = function(parent) {
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
            this.tr = tr;
            parent.appendChild(tr);
        };


        /**
         * 
         * Loads Details of asset
         * 
         * 
         * 
         */
        this.detailsToggle = function() {
            var self = this;
            var loadHistory = function(from, to, aid, cid) {
                // Start request
                var request = new XMLHttpRequest();
                request.open('GET', '/asset/' + aid + '/historical/' + cid + '/' + (Date.now() - 1000 * 86400 * from) + '/' + to, true);
                request.onload = function() {
                    if (request.status >= 200 && request.status < 400) {
                        try {
                            var data = JSON.parse(request.responseText);
                            if (!self.lineChart) {
                                self.lineChart = emptyLineChart(self.trDetail.firstChild, '100%', 200);
                            }
                            var series = self.lineChart.addSeries({
                                type: 'area',
                                name: '',
                                data: []
                            });
                            for (let i = 0; i < data.length; i++) {
                                // Add all points to chart
                                series.addPoint([data[i].timestamp * 1000, data[i].last], false, false, false);
                            }
                            // Remove former series and replace
                            self.lineChart.series[0].remove();
                            self.lineChart.redraw();
                        }
                        catch (e) {
                            console.log(e);
                        }
                    }
                    else {
                        console.log(request.status);
                    }
                };
                request.onerror = function() {
                    console.log('There was an error in xmlHttpRequest!');
                };
                request.send();
            };

            // First Time create DOM-Row (tr) and append to Position row
            if (this.showDetails === -1) {
                var tr = document.createElement('tr');
                var td = document.createElement('td');
                td.colSpan = '9';
                tr.appendChild(td);
                this.trDetail = tr;
                this.tr.parentNode.insertBefore(tr, this.tr.nextSibling);
                var buttonTypes = { week: 7, month: 30, year: 365, all: 3650 };
                for (let i in buttonTypes) {
                    let button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'btn btn-secondary btn-sm';
                    button.innerHTML = i;
                    button.value = buttonTypes[i];
                    button.onclick = function() {
                        let cid = getCid(self.aid, self.cid);
                        loadHistory(this.value, Date.now(), self.aid, cid)
                    };
                    self.trDetail.firstChild.appendChild(button);
                };
                this.showDetails = true;
            }
            // Toggle visibility => hide
            else if (this.showDetails) {
                this.trDetail.style.display = 'none';
                this.showDetails = false;
            }
            // Toggle visibility => show
            else {
                this.trDetail.style.display = 'table-row';
                this.showDetails = true;
            }

            // Show Details
            if (this.showDetails) {
                let cid = getCid(self.aid, self.cid);
                loadHistory(7, Date.now(), self.aid, cid);
            }
        };
    };



    // -------------------------
    // END OF Position
    // -------------------------




    /**
     * Cell Object
     *
     * @param {String} title
     * @param {Array} defaults
     * @param {Object} pos parent > position of which cell is part of
     *
     */
    var Cell = function(title, defaults, pos) {
        var self = this;
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
        this.onclick = null;
        // Set defaults
        for (let i in defaults) {
            this[i] = defaults[i];
        }
        this.dom = document.createElement('td');
        /**
         * Renders Cell the first time
         * only called once
         */
        this.render = function() {
            var td = this.dom;
            // Image-Cells
            if (this.value !== null && this.image) {
                td.innerHTML = '';
                let value = this.value.replace(/\s/g, '-').toLowerCase();
                let path = 'images/' + this.image.folder + '/';
                let src = path + value + '.' + this.image.filetype;
                td.style.backgroundImage = 'url(' + src + ')';
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
            td.onmousedown = function() { return false; };
            // For Testing purpose
            td.ondblclick = function() {
                console.log(this.value);
            };
            if (typeof(this.onclick) === 'function') {
                td.onclick = this.onclick(this.position);
            }
        };

        /**
         * Calculates cell using formula
         */
        this.calc = function(cb) {
            if (this.col) {
                this.value = this.position[this.col];
                cb();
            }
            if (this.formula !== null) {
                if (typeof this.formula === 'function') {
                    this.formula(this, this.position, cb);
                }
                else if (this.formula.type === '*') {
                    this.value = this.position.row[this.formula.x].value * this.position.row[this.formula.y].value;
                    cb();
                }
            }
        };
        /**
         * Formats a Cell Value to readable format
         */
        this.tValue = function() {
            var html = this.value;
            if (typeof html === 'number') {
                this.dom.style.textAlign = 'right';
            }
            if (this.round === -1) {
                if (typeof html === 'number') {
                    let digits = smartRound(html);
                    //html = cutTrailingZeros(html.toLocaleString('de-CH-1996', {minimumFractionDigits:digits}));
                    html = html.toLocaleString('de-CH-1996', { minimumFractionDigits: digits });
                }
            }
            else if (typeof html === 'number' && this.round > -1) {
                var num = html;
                html = html.toFixed(this.round);
                html = Number(html).toLocaleString('de-CH-1996', { minimumFractionDigits: this.round });
                if (this.prefix === 'sign' && num > 0) html = '+' + html;
            }
            return html;
        };

        /**
         * Updates Cell (only if value has changed)
         */
        this.update = function() {
            var val1 = this.value;
            var self = this;
            this.calc(function() {
                self.dom.dataValue = self.value;
                // update html if value has changed
                if (val1 === null || self.value !== val1) {
                    self.dom.innerHTML = self.tValue();
                    if (typeof self.value === 'number' && Math.abs(self.value / val1 - 1) > 0.003) {
                        self.dom.style.transition = 'color 1s';
                        if (self.value > val1) {
                            self.dom.style.backgroundColor = '#ccffcc';
                        }
                        else if (self.value < val1) {
                            self.dom.style.backgroundColor = '#ff9999';
                        }
                        var dom = self.dom;
                        setTimeout(function() {
                            dom.style.transition = 'backgroundColor 4s';
                            dom.style.backgroundColor = 'transparent';
                        }, 2500);
                    }
                }
            });
        };
        this.calc(function() {
            self.render();
        });
    };



    // -------------------------
    // END OF Cell
    // -------------------------


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
                data.backgroundColor.push((r in colors) ? colors[i] : stringToColour(i));
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
    var emptyLineChart = function(parent, w, h) {
        var div = document.createElement('div');
        div.style.width = (typeof w === 'number')?w + 'px':w;
        div.style.height = h + 'px';
        parent.appendChild(div);
        var chart = new Highcharts.Chart(div, {
            chart: {
                zoomType: 'x'
            },
            title: {
                text: ''
            },
            xAxis: {
                type: 'datetime'
            },
            type: 'line',
            plotOptions: {
                area: {
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1
                        },
                        stops: [
                            [0, Highcharts.getOptions().colors[0]],
                            [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                        ]
                    },
                    marker: {
                        radius: 2
                    },
                    lineWidth: 1,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    threshold: null
                }
            },
            legend: {
                enabled: false
            },
            series: [{}]
        });
        return chart;
    };

    var test = function() {
        var body = document.getElementsByTagName("BODY")[0];
        emptyLineChart(body, 300, 300);
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
            'Bitcoin': '#f7931a',
            'Litecoin': '#8b8b8b',
            'Storjcoin X': '#2581fc'
        };
        var self = this;
        // Create new empty ChartJs Object and ad it
        // to parent DOM-Element
        this.chart = emptyPieChart(parent);
        // Handler to update Chart data
        this.update = function() {
            chartData(positionCollection.getTotAsset(), colors, self);
            self.chart.update(); // updates chartjs object (animated stlye)
        };
        // Call chartData() once on object-creation
        // to set initial data-values
        chartData(positionCollection.getTotAsset(), colors, self);
    };

    var TotMarketChart = function(parent) {
        var colors = {
            'Poloniex': '#01636f',
            'OKEX': '#2581fc',
            'ledger wallet': '#8b8b8b'
        };
        var self = this;
        this.chart = emptyPieChart(parent);
        this.update = function() {
            chartData(positionCollection.getTotMarket(), colors, self);
            self.chart.update(); // updates chartjs object (animated stlye)
        };
        chartData(positionCollection.getTotMarket(), colors, self);
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
        for (let i in rates) {
            // if not exact rate found
            // try to get any rate for aid
            // even not for same cid
            if (rates[i].aid === aid && rates[i].last !== undefined) {
                return rates[i];
            }
        }
        return false;
    };


    /**
     * get available cid for rate
     * returns alternative cid, if whished cid not available
     *
     * @param  {Number} aid Asset-ID
     * @param  {Number} cid Connector-ID
     * @return {Number} cid
     */
    var getCid = function(aid, cid) {
        var best = rates[aid + '_' + cid];
        if (best !== undefined && best.last !== undefined) {
            return best.cid;
        }
        for (let i in rates) {
            // if not exact rate found
            // try to get any rate for aid
            // even not for same cid
            if (rates[i].aid === aid && rates[i].last !== undefined) {
                return rates[i].cid;
            }
        }
        return false;
    };



    /**
     * Historical Data Object
     * contains historical data and chart objects
     */

    var History = function(callback) {
        // Arrays that holds historical data
        this.data = {
            usd: [],
            btc: []
        };


        // Variable that holds all historical chart objects
        this.charts = {};
        /**
         * Creates a HighChart.StockChart to display Historical
         * Data. This Chart gets updated in realtime by adding
         * new data to the series[].data array
         * @param {string} name Name of the chart ex. main/modal
         * @param {DOM} parent The DOM element of the parant
         */

        this.appendChart = function(name, parent) {
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

        this.update = function(newData) {
            this.data.usd.push(newData.usd);
            this.data.btc.push(newData.btc);
            var timestamp = Date.now();
            for (let i in this.charts) {
                if (this.charts[i] != undefined) {

                    // new point to dataset (see: https://api.highcharts.com/class-reference/Highcharts.Series%23addPoint)
                    // method addPoint(options [, redraw] [, shift] [, animation])
                    this.charts[i].series[0].addPoint([timestamp, newData.usd], false, false, false);
                    //this.charts[i].series[1].addPoint([Date.now(), newData.btc], false);

                    // Redraw chart
                    // see: https://api.highcharts.com/class-reference/Highcharts.Chart.html#redraw
                    this.charts[i].redraw();
                }
            }
        };

        this.request = function(callback) {
            var self = this;
            var request = new XMLHttpRequest();
            request.open('GET', '/history', true);
            request.onload = function() {
                if (request.status >= 200 && request.status < 400) {
                    try {
                        var d = JSON.parse(request.responseText);
                        for (let i = 0; i < d.length; i++) {
                            self.data.usd.push([d[i].timestamp * 1000, d[i].dollar]);
                            self.data.btc.push([d[i].timestamp * 1000, d[i].btc]);
                        }
                        callback(null, self);
                    }
                    catch (e) {
                        console.log(e);
                        console.log(new Date().toLocaleString() + ': not logged in');
                        btnLogin.show();
                        callback(e);
                    }
                }
                else {
                    // Error
                    callback('Request returned Error status ' + request.status);
                }
            };
            request.onerror = function(e) {
                console.log('There was an error in xmlHttpRequest!');
                callback(e);
            };
            request.send();
        };

        this.remove = function(name) {
            delete this.charts[name];
        };

        // Call prototype-function request
        // which requests new live data from server
        this.request(callback);
    };


    var modal_history = function() {
        var modal = new BModal('History');
        modal.appendTo(document.getElementsByTagName("BODY")[0]);
        history.appendChart('modal', modal.content);
        $(modal.dom).modal(true, true);
        $(modal.dom).on('hidden.bs.modal', function() {
            history.remove('modal');
        });
    };

    var BModal = function(title) {
        var modal = document.createElement('div');
        modal.className = 'modal';
        modal.role = 'dialog';

        // Dialog
        var dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        dialog.style.width = '100%';
        //dialog.style.height = '80%';
        //dialog.style.margin = '0';
        //dialog.style.padding = '0';

        // Content Area
        var content = document.createElement('div');
        content.className = 'modal-content';
        //content.style.height = 'auto';
        //content.style.minHeight = '100%';
        //content.style.borderRadius = '0';

        // Header
        var header = document.createElement('div');
        header.className = 'modal-header';

        // Close Button at bottom
        var close = document.createElement('button');
        close.className = 'close';
        close.dataDismiss = 'modal';
        close.innerHTML = '&times;';

        // Title of Modal
        var dTitle = document.createElement('h4');
        dTitle.className = 'modal-title';
        dTitle.innerHTML = title;

        // Body
        var body = document.createElement('div');
        body.className = 'modal-body';

        // Footer
        var footer = document.createElement('div');
        footer.className = 'modal-footer';

        // Close Button upper right corner
        var close2 = document.createElement('button');
        close2.className = 'btn btn-default';
        close2.dataDismiss = 'modal';
        close2.innerHTML = 'Close';

        // Throw everything together
        footer.appendChild(close2);
        header.appendChild(close);
        header.appendChild(dTitle);
        content.appendChild(header);
        content.appendChild(body);
        content.appendChild(footer);
        dialog.appendChild(content);
        modal.appendChild(dialog);

        // save modal tree
        this.dom = modal;
        this.content = body;
        this.appendTo = function(parent) {
            parent.appendChild(this.dom);
        };
    };
    
    
    /**
     * 
     * Retrieves Asset %-Change over time
     * 
     * 
     * 
     * 
     */
    var assetGetChange = function(secondAgo, cell, position, cb) {
        var request = new XMLHttpRequest();
        request.open('GET', '/asset/' + position.aid + '/historical/' + position.cid + '/' + secondAgo, true);
        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                try {
                    var oldValue = (JSON.parse(request.responseText)).v;
                    cell.value = (oldValue === undefined) ? 0 : (position.last / oldValue - 1) * 100;
                    cb();
                }
                catch (e) {
                    console.log(e);
                    cb();
                }
            }
            else { // different status than 200-400
                cb();
            }
        };
        request.onerror = function() {
            console.log('There was an error in xmlHttpRequest!');
        };
        request.send();
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

    var cutTrailingZeros = function(number) {
        number = number.toString();
        var newNumber = number;
        if (number.indexOf('.')) {
            while (newNumber.length > 2) {
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
    var imageExists = function(image_uri, td, cb) {
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
    var inArray = function(needle, haystack) {
        var length = haystack.length;
        for (let i = 0; i < length; i++) {
            if (haystack[i] == needle) return true;
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
