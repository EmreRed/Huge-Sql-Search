var fs = require('fs'),
    es = require('event-stream');

let conf = {
  'sql'   : 'database.sql',
  'table' : 'users',
  'column': "id",
  'value' : 9400
};

var cols = [];
var rows = [];
var lines = [];
var status = '';
var s = fs.createReadStream(conf.sql)
    .pipe(es.split())
    .pipe(es.mapSync(function(line) {
        s.pause();
        if(line.includes("`"+conf.table+"`") || status == 'col'){
          if(line.includes("CREATE TABLE") || status == 'col'){
            if(line.includes("CREATE TABLE")) status = 'col';
            else if(line.substr(0,1) == ')') status = '';
            else {
              line = line.trim();
              if(line.substr(0,1) == '`') cols.push(line.split('`')[1]);
            }
          } else if(line.includes("INSERT INTO")) {
            line = line.replace(/[\(|\,]'(.*?)'[\)|\,]/gs, function(i, match) {
              return i.replace(match,match.split(',').join(''));
            });
            if(line.trim().substr(-2) == ');') status = '';
            else if(line.includes("INSERT INTO")) status = 'row';
            for (var variable of line.split('VALUES (')[1].split(');')[0].split('),(')) {
              var row = {};
              var index = 0;
              for (var val of variable.split(',')) {
                var key = cols[index] ? cols[index].toString() : null;
                row[key] = val
                index++;
              }
              if(conf.column || conf.value){
                if((conf.column && conf.value)  && rows[conf.column] == conf.value) rows.push(row);
                else if((conf.column && !conf.value) && rows[conf.column]) rows.push(row);
                else if((!conf.column && conf.value) && rows.includes(conf.value)) rows.push(row);
              } else {
                console.log(row);
                rows.push(row);
              }
            }
          }
        }
        s.resume();
    })
    .on('error', function(err) {
        console.log('Error:', err);
    })
    .on('end', function() {
      if(rows.length > 0){
        today = new Date(new Date().toString().split('GMT')[0]+' UTC').toISOString().split('.')[0].split('-').join('').split('T').join('').split(':').join('');
        var file = `${conf.table}-${today}.json`;
        let data = JSON.stringify(rows);
        fs.writeFileSync(file, data);
        console.log(`Saved: ${file}`);
      }else{
        console.log('Not Found');
      }
    })
);
