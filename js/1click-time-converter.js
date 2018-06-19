Locales = {
    list : function(){
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
        var locales = Locales.list(),
            ind = locales.indexOf(locale);
        if(ind > - 1){
            locales.splice(ind,1);
        }
        Locales._set(locales);
    },
    has : function(locale){
        var list = Locales.list();
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
}



$('body').append('<div class="append"><button type="button" class="btn">New clock</button></div>');

var tzs = moment.tz.names(),
    selectHtml =  '<select id="locales-list">';
for(let tz of tzs){
    
    selectHtml += '<option value="' + tz+ '">' + toHumanReadable(tz) + '</option>';
}
selectHtml += '</select>';
$('.append').append(selectHtml);
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
        return 'Local time';
    }
    var humanReadable = locale.split(/\//);
    //console.log(humanReadable);
    humanReadable.shift();
    return humanReadable.join(' - ').replace(/_/g,' ');
}
function refreshClocks(){
    $('#list').empty();
    locales = Locales.list();
    for(var locale of locales){
        //console.log(locale);
        var div = $('<div>').addClass(locale.toLowerCase().replace(/\//,'-'));
        div.append('<h4 class="clock-title">' + toHumanReadable(locale) + '</h4>');
        div.append('<div class="clock-inner"></div>');
        div.append('<button type="button" class="clock-remove">X</button>');
        //console.log(div);
        div.myClock = new bartificer.Worldclock(div.find('.clock-inner'),{showSeconds:true,timezone:locale});
        $('#list').append(div);
    }
}
refreshClocks();
$('.clock-remove').on('click')
//myClock = new bartificer.Worldclock($('#clock1'),{showSeconds:true});
