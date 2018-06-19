Locales = {
    getList : function(){
        var locales = Locales._get();
        locales.unshift('LOCAL');
        return locales;
    },
    add : function(locale){
        var locales = Locales._get();
        locales.push(locale);
        Locales._set(locales);
    },
    remove : function(locale){
        var locales = Locales._get(),
            ind = locales.indexOf(locale);
        if(ind > - 1){
            locales.splice(ind,1);
        }
        Locales._set(locales);
    },
    has : function(locale){
        var list = Locales.getList();
        return list.indexOf(locale) > -1;
    },
    _set : function(locales){
        localStorage.setItem('locales', JSON.stringify(locales));
    },
    _get: function(){
        var locales = [];
        try {
            locales = localStorage.getItem('locales');
            locales = JSON.parse(locales);

        } catch (error) {
            locales = [];
        }
        console.log(locales);
        return locales ? locales : [];
    },
    list:{},
    setTimeHtml : '<div class="clock-set-time-wrp">' 
                    + 'H: <input type="text" class="clock-set-time hour" />'  
                    + 'M: <input type="text" class="clock-set-time minute" />' 
                    //+ 'S: <input type="text" class="clock-set-time second" />'  
                    + '<button type="button" class="back-to-clock btn">' + chrome.i18n.getMessage('back_to_live_clock')+ '</button></div>'
}



$('body').prepend('<h2>' + chrome.i18n.getMessage('my_clocks')+ '</h2>');
$('body').append('<div class="append"><h3>' + chrome.i18n.getMessage('append_new_clock')+ '</h3><span class="clock-label">' + chrome.i18n.getMessage('new_clock_in')+ ': </span><button type="button" class="btn">' + chrome.i18n.getMessage('add')+ '</button></div>');

var tzs = moment.tz.names(),
    selectHtml =  '<select id="locales-list">';
for(let tz of tzs){
    
    selectHtml += '<option value="' + tz+ '">' + toHumanReadable(tz) + '</option>';
}
selectHtml += '</select>';
$('.clock-label').after(selectHtml);
$('.append .btn').click(function(){
    console.log($('#locales-list').val());
    if(!Locales.has($('#locales-list').val())){
        Locales.add($('#locales-list').val());
        refreshClocks();
    }
});
$('#locales-list').select2();


function toHumanReadable(locale){
    if('LOCAL' == locale){
        return  chrome.i18n.getMessage('local_time');
    }
    var humanReadable = locale.split(/\//);
    //console.log(humanReadable);
    humanReadable.shift();
    return humanReadable.join(' - ').replace(/_/g,' ');
}
function refreshClocks(){
    $('#list').empty();
    locales = Locales.getList();
    for(var locale of locales){
        //console.log(locale);
        var partClass = locale.toLowerCase().replace(/\//,'-');
        var div = $('<div class="clock-wrp clearfix">').attr('data-zone',partClass);
        div.append('<h4 class="clock-title">' + toHumanReadable(locale) + '</h4>');
        div.append('<div class="clock-inner"></div>');
        if("LOCAL" != locale){
            div.append('<input class="machine-name" type="hidden" value="' + locale + '"/>');
            div.append('<button type="button" class="clock-remove">X</button>');
        }
        div.append('<button type="button" class="btn set-time">' + chrome.i18n.getMessage('check_other_time')+ '</button>');
       
        //console.log(div);
        Locales.list[partClass] = {
            clock:new bartificer.Worldclock(div.find('.clock-inner'),{showSeconds:false,timezone:locale}),
            locale : locale
        }
        $('#list').append(div);
    }
}

refreshClocks();

$('#list').on('click', '.clock-remove', function(){
    Locales.remove($(this).siblings('.machine-name').val());
    refreshClocks();
});

$('#list').on('click', '.set-time', function(){
    $('.clock-set-time-wrp').remove();
    $(this).after(Locales.setTimeHtml);
});

$('#list').on('click', '.back-to-clock', function(){
    $('.clock-set-time-wrp').remove();
    for(var zoneName of Object.keys(Locales.list)){
        console.log(Locales.list[zoneName].clock);
        Locales.list[zoneName].clock.releaseClock();
    }
});

$('#list').on('keyup', 'input.clock-set-time', function(){
    var that = this;
    if(timeout){
        clearTimeout(timeout);
    }
    var timeout = setTimeout(function(){
        changeClocks(that);
    },200);
});
// $('#list').on('change', 'input.clock-set-time', function(){
//     changeClocks(this);
// });
//myClock = new bartificer.Worldclock($('#clock1'),{showSeconds:true});
function changeClocks(that){
    var continer = $(that).closest('.clock-wrp'),
        unique = continer.attr('data-zone'),
        worldclock = Locales.list[unique],
        now = moment();
    if("LOACL" != Locales.list[unique].locale){
        //console.log(worldclock.locale);
        //console.log(now.hour(), now.minute(), now.second())
        now.tz(worldclock.locale);
        //console.log(now.hour(), now.minute(), now.second())
    }
    if( continer.find('hour').val() === '' || !continer.find('minute').val() === ''){
        return;
    }
    var data = {
        'hour' : getVal(continer, 'hour'),
        'minute' :  getVal(continer, 'minute')
//        'second' : getVal(continer, 'second'),
    };
    $('.clock-set-time-wrp .wrn').remove();
    if(data.hour > 23 || data.hour < 0 || data.minute > 59 || data.minute < 0|| data.second > 59){
        $('.clock-set-time-wrp').append('<div class="wrn">' + chrome.i18n.getMessage('please_fill_valid')+ '</div>');
    }
    
    for(var timePartName of Object.keys(data)){
        now[timePartName](data[timePartName]);
    }
    //console.log(now.hour(), now.minute(), now.second())
    for(var zoneName of Object.keys(Locales.list)){
        
        //if(zoneName != unique){
            if("LOCAL" == Locales.list[zoneName].locale){
                now.tz(moment.tz.guess());
            }
            else{
                now.tz(Locales.list[zoneName].locale);
            }
            console.log(now.hour(), now.minute(), now.second(), Locales.list[zoneName].locale)
            Locales.list[zoneName].clock.fixClock(now.hour(), now.minute(), now.second())
        //}
    }
}

function getVal(cont,name){
    var val = Number(cont.find('.' + name).val());
    console.log(name,val);
    return !isNaN(val) ? val : (name == "second" ? 0 : -1);
}