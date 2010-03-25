

progressBar = function(opts) {

  var options = progressBar.combineOptions(opts, {
    height:       '1.3em',
    width:        '150px',
    top:          '30px',
    right:        '5px',
    colorBar:     '#68C',
    background:   '#FFF',
    fontFamily:   'Arial, sans-serif',
    fontSize:     '12px'
  });

  var current = 0;
  var total = 0;

  var shadow = '1px 1px #888';

  var controlDiv = document.createElement('div');
  controlDiv.id = 'progressdiv';
  controlDiv.style.cssText =
    'margin: 5px; margin-right: 8px; '+
    'width: '+options.width+'; height: '+options.height+'; ';

  var control = document.createElement('div');
  control.id = 'progressbar'
  control.style.cssText =
    'width: 100%; height: 100%; visibility: hidden; '+
    'background: white; text-align: center; '+
    'border: 1px solid #BBB; box-shadow: '+shadow+'; '+
    '-webkit-box-shadow: '+shadow+'; -moz-box-shadow: '+shadow+'; ';

  control.style.fontFamily = options.fontFamily;
  control.style.fontSize = options.fontSize;

  var div = document.createElement('div');
  div.id = 'pb_text';
  div.style.cssText =
    'position: absolute; width: 100%; height: 100%; ';
  div.style.fontFamily = options.fontFamily;

  var bar = document.createElement('div');
  bar.id = 'pb_background';
  bar.style.cssText =
    'position: absolute; width: 0%; height: 100%; '+
    'background-color: '+options.colorBar+';';

  control.appendChild(bar);
  control.appendChild(div);

  controlDiv.appendChild(control);

  var draw = function(mapDiv) {
    controlDiv = control;
    contcontrolDivrol.style.cssText = control.style.cssText +
      'z-index: 20; position: absolute; '+
      'top: '+options.top+'; right: '+options.right+'; '+
      document.getElementById(mapDiv).children[0].appendChild(controlDiv);
  }

  var start = function(total_) {
    if (parseInt(total_) === total_ && total_ > 0) {
      total = total_;
      current = 0;
      bar.style.width = '0%';
      div.innerHTML = 'Loading...';
      control.style.visibility = 'visible';
    }

    return total;
  }

  var updateBar = function(increase) {
    if (parseInt(increase) === increase && total) {
      current += parseInt(increase);
      if (current > total) {
        current = total;
      } else if (current < 0) {
        current = 0;
      }

      bar.style.width = Math.round((current/total)*100)+'%';
      div.innerHTML = current+' / '+total;
    } else if (!total){
      return total;
    }

    return current;
  }

  var hide = function() {
    control.style.visibility = 'hidden';
  }

  var getDiv = function() {
    return controlDiv;
  }

  var getTotal = function() {
    return total;
  }

  var setTotal = function(total_) {
    total = total_;
  }

  var getCurrent = function() {
    return current;
  }

  var setCurrent = function(current_) {
    return updateBar(current_-current);
  }

  return {
    draw:         draw,
    start:        start,
    updateBar:    updateBar,
    hide:         hide,
    getDiv:       getDiv,
    getTotal:     getTotal,
    setTotal:     setTotal,
    getCurrent:   getCurrent,
    setCurrent:   setCurrent
  }

}

progressBar.combineOptions = function (overrides, defaults) {
  var result = {};
  if (!!overrides) {
    for (var prop in overrides) {
      if (overrides.hasOwnProperty(prop)) {
        result[prop] = overrides[prop];
      }
    }
  }
  if (!!defaults) {
    for (prop in defaults) {
      if (defaults.hasOwnProperty(prop) && (result[prop] === undefined)) {
        result[prop] = defaults[prop];
      }
    }
  }
  return result;
}