(function() {
//taken from web/lightbox/admin_views.py which is taking from lightbox-android/blob/master/LightboxPhotos/src/com/lightbox/android/photos/beta/model/Photo.java
filter_names = {0: 'No filter',1: 'Instafix',2: 'Black + White',   3: 'Sepia',   4: 'Cyano',   5: 'Retro',   6: 'Lomo',   7: 'Redscale',   8: 'XPro',   9: 'Fisheye',   10: 'Portia',   11: 'Dotty',   12: '8 Bit',   13: 'Ansel',   14: 'Testino', 15:'Warhol', 16:'HDR', 17:'Posterize', 18: 'Georgia', 19: 'Sahara'};
var photoids = {};
CACHE.columns = [];
CACHE.loaded = false;

if(!window.ajaxparams) {
    //when it's an empty page, we're hiding the share button
    $('#toolbar').hide();
    ajaxparams = {};
}

var setTH = function() {
    var maxh;
    maxh = Array.max(CACHE.columns);
    $('#thumbnails').css({'height': maxh + Math.floor(ajaxparams.collagewidth / 5) });
    return maxh;
}

var closeOff = function() {
    var i,out, maxh, leftadjust, rightadjust;
    if(ajaxparams.collage) {
        spacings = getspacings();
        $('#collage_closer').show();
        maxh = setTH();
        $('#thumbnails .bottomfiller').remove();
        if(Array.min(CACHE.columns) === Array.max(CACHE.columns)) {$('#thumbnails').removeClass('loading'); return;}
        out = '';
        for(i = 0; i < CACHE.columns.length; i++) {
            leftadjust = 0; rightadjust = 0;
            if(i > 0 && CACHE.columns[i-1] <= CACHE.columns[i]) {leftadjust = spacings.photospacing;}
            if(i < CACHE.columns.length - 1 && CACHE.columns[i] > CACHE.columns[i+1]) { rightadjust = spacings.photospacing;}
            out += '<div class="bottomfiller" style="width: ' + (ajaxparams.collagewidth - spacings.photospacing + leftadjust + rightadjust) + 'px; height: ' + (maxh - CACHE.columns[i] - spacings.photospacing + Math.floor(ajaxparams.collagewidth / 5)) + 'px; margin-top: ' + (CACHE.columns[i]) + 'px; margin-left: '+(i * ajaxparams.collagewidth - leftadjust)+'px;"></div>';
        }
        $('#thumbnails').removeClass('loading').append(out);
    }
}

var handleThumbs = function() {
    if (typeof(ajaxparams['oldestid']) == 'undefined' && ajaxparams['nav_type'] != 'recentphotos') {
        CACHE.loaded = true;
        closeOff();
    }
    var semaphore = false;
    return function() {
        var out = [];
        var picspercall = 20;
        var url, type;
        if (semaphore) {
            return false;
        }
        if (!CACHE.loaded) {
            //if we're low enough, we need to fetch more
            if ($('#thumbnails .thumbnail').length == 0 || $('#thumbnails .thumbnail:last img').offset().top <  $(window).scrollTop() + $(window).height() * 2) {
                if (semaphore) {
                    return false;
                }
                semaphore = true;
                if(!ajaxparams.collage) {
                    $('#thumbnails').append('<a href="#" class="thumbnail loading"><img src="" alt="" /></a>');
                }

                url = paginateurl({
                    "nav_type": ajaxparams['nav_type'],
                    "nav_id": ajaxparams['nav_id'],
                    "id": ajaxparams['oldestid'] || null,
                    "order": "desc",
                    "limit": picspercall
                });
                type = 'json';
                if(ajaxparams['nav_type'] == 'wallphotos') { type = 'jsonp'; }

                $.ajax({
                    url: url,
                    dataType: type,
                    crossDomain: !!(type == 'jsonp'),
                    type: ajaxparams['nav_type'] == 'recentphotos' ? 'POST' : 'GET',
                    success: function(data) {
                        if(!ajaxparams.collage) {
                            $('#thumbnails a.thumbnail.loading').remove();
                        }
                        if (data.status == 200) {
                            $.each(data.body.photos, function(i,photo) {
                                var thm = generateThumbnail(photo);
                                if(thm) {
                                    out.push(thm);
                                    if(Modernizr.hybrid) {
                                        allthumbnails.photos.push(photo);
                                    }
                                }
                            });
                            $('#thumbnails').append(out.join(''));
                            $('#thumbnails img.notloaded').on('load', function() {
                                $(this).removeClass('notloaded');
                            });
                            handleResize();

                            //this may or may not happened with handleResize:
                            setTH();

                            if(ajaxparams['nav_type'] == 'recentphotos' && $('#thumbnails').data('filter')) {
                                $('#thumbnails_header h6 a.active').click();
                            }
                            semaphore = false;
                            ajaxparams['oldestid'] = data.body.photos.length > 0 ? data.body.photos[data.body.photos.length - 1].id : undefined;
                            
                            //if the number of deduplicated objects are less than the asked number / 4, we consider the page to be done.
                            if (data.body.photos.length < picspercall || out.length < picspercall / 4) {
                                CACHE.loaded = true;
                                closeOff();
                            } else {
                                //to make it more didactic
                                setTimeout(handleThumbs, 200);
                            }
                        }
                    }
                })
            } else {
                //thats enough photos for now
            }
        }
    }
}();

if(ajaxparams['nav_type'] === 'recentphotos') {
    var lm = new Date().getTime();
    $('body').on('mousemove', function (e) {
        lm = new Date().getTime();
    });
    setInterval(function() {
            if(Math.floor((new Date().getTime() - lm)/1000) > 5 * 60) {
                document.location.reload();
            }
        var url, picspercall, firstid;
        if($(window).scrollTop() > 0) {return;}
        picspercall = 20;
        firstid = $('#thumbnails a.thumbnail:eq(0)').data('photo_id') || null;

        if(!firstid) {
            return;
        }
        
        url = paginateurl({
            "nav_type": ajaxparams['nav_type'],
            "id": firstid,
            "order": "asc",
            "limit": picspercall
        });

        $.ajax({
            url: url,
            dataType: 'json',
            type: ajaxparams['nav_type'] == 'recentphotos' ? 'POST' : 'GET',
            success: function(data) {
                if($(window).scrollTop() > 0) {return;}
                out = [];
                if (data.status == 200) {
                    $.each(data.body.photos, function(i,photo) {
                        var thm = generateThumbnail(photo);
                        if(thm) {
                            out.unshift(thm);
                        }
                    });
                    if(out.length) {
                        $('#thumbnails').prepend(out.join(''));
                        handleResize();
                        if($('#thumbnails').data('filter')) {
                            $('#thumbnails_header h6 a.active').click();
                        }
                    }
                }
            }
        });
    }, 3000);
}

if(ajaxparams['nav_type'] == 'recentphotos') {
    //filter+version stuff. this is not a piece of code.
    rpmenu = function() {
        var out = [];
        out = ['<a href="" class="switch ondark" style="color: black;">☊ VERSION</a>']
        
        $('#thumbnails_header h6').bind('refresh', function() {
            var version_pop = {}, version_list = [], filter_pop = {}, filter_list = [], out = [], outt ='';
            if($('#thumbnails').data('filtermode') == 'version') {
                outt = '<a href="" class="switch ondark" style="color: black;">☊ VERSION</a>';
                out.push('<a href="" class="ondark active">ALL</a>');
                out.push('<a href="" class="ondark">Unknown</a>');
                $('#thumbnails a span.version:lt(199)').each(function(i,data) {
                    vn = $(data).html();
                    if(!version_pop[vn]) {
                        version_pop[vn] = 0;
                        version_list.push(vn);
                    }
                    version_pop[vn] += 1;
                });
                version_list = version_list.sort(function(a,b) { return version_pop[b] - version_pop[a];})
                $.each(version_list, function(i,version) {
                    out.push('<a href="" class="ondark">' + version + '</a>');
                });
            } else if($('#thumbnails').data('filtermode') == 'filter') {
                outt = '<a href="" class="switch ondark" style="color: black;">☋ FILTER</a>';
                out.push('<a href="" class="ondark active">ALL</a>');
                out.push('<a href="" class="ondark">Unknown</a>');
                $('#thumbnails a span.filter:lt(199)').each(function(i,data) {
                    vn = $(data).html();
                    if(vn == 'undefined') {return;}
                    if(!filter_pop[vn]) {
                        filter_pop[vn] = 0;
                        filter_list.push(vn);
                    }
                    filter_pop[vn] += 1;
                });
                filter_list = filter_list.sort(function(a,b) { return filter_pop[b] - filter_pop[a];})
                $.each(filter_list, function(i,filter) {
                    out.push('<a href="" class="ondark">' + filter + '</a>');
                });
            }
            $('#thumbnails_header h6').html(outt + ': ' + out.join(' | '));
            $('#thumbnails_header a:not(.switch):eq(0)').click();
        });
        
        $('#thumbnails_header h6').html(out.join(' | '));

        setTimeout(function() { $('#thumbnails_header h6').trigger('refresh');},1000);
        setTimeout(function() { $('#thumbnails_header h6').trigger('refresh');},4000);

        $('#thumbnails_header h6 a').live('click', function(e) {
            e.preventDefault();
            if($(this).hasClass('switch')) {
                if($(this).html().match('FILTER')) {
                    $('#thumbnails').data('filtermode', 'version');
                } else  {
                    $('#thumbnails').data('filtermode', 'filter');
                }
                $('#thumbnails_header h6').trigger('refresh');
                return;
            }
            var af = $(this).html();
            if(af == 'Unknown' || af == '') {af ='undefined'; }
            $('#thumbnails').data('filter',af);
            $(this).addClass('active').siblings().removeClass('active');
            if(af == 'ALL') {
                $('#thumbnails').data('filter',0);
                $('#thumbnails a').show();
                return;
            }
            $('#thumbnails a').removeClass('want');
            if($('#thumbnails').data('filtermode') == 'filter') {
                $('#thumbnails a span.filter:contains(' + af + ')').parent().addClass('want');
            } else {
                if(af == 'undefined') {
                    $('#thumbnails a span.version').parent().addClass('dontwant');
                    $('#thumbnails a:not(".dontwant")').addClass('want');
                    $('#thumbnails a').removeClass('dontwant');
                } else {
                    $('#thumbnails a span.version:contains(' + af + ')').parent().addClass('want');
                }
            }
            $('#thumbnails a').hide();
            $('#thumbnails a.want').show();
        });
        $('#thumbnails_header h6 a.switch').click();
    }()
}

var generateThumbnail = function(photo) {
    var match, version = '', gcs;
    if (!photoids[photo.id] && photo.lrg_url) { //deduplicate
        if(photo.meta && photo.meta.VersionName) {
            version = '<span class="version">[ ' + photo.meta.VersionName + ' ]</span>';
        }
        if(photo.meta && photo.meta.version_name) {
            version = '<span class="version">[ ' + photo.meta.version_name + ' ]</span>';
        }
        photoids[photo.id] = 1;
        photo.title = photo.title.replace(new RegExp("\"",'g'), '&quot;');
        if(ajaxparams['nav_type'] == 'recentphotos') {photo.album = 'public'; } //recentphotos uses api v1
        if(ajaxparams.collage) {
            gcs = getCollageSize(photo);
        }
        return '<a href="' + photo.url + '" rel="' + (photo.album == 'public' ? '' : 'nofollow') + '" class="thumbnail" ' + (ajaxparams.collage ? '' : 'title="' + photo.title + '" ') + 'data-photo_id="'+photo.id+'" data-width="'+photo.lrg_width+'" data-height="'+photo.lrg_height+'" data-lrg="'+photo.lrg_url+'" ' + (ajaxparams.collage ? 'style="' + gcs.style + '"' : '') +'>' + 
        (ajaxparams.collage ? ('<span class="like' + (photo.like ? ' active' : '') + '" data-photo_id="' + photo.id + '"></span>') : '') + 
        (ajaxparams.collage ? ('<div class="title"><span class="padder">' + photo.title + '</span></div>') : '') +
        (photo.album == 'public' ? '' : '<span class="privacy' + (photo.album == 'unlisted' ? ' unlisted' : '')+'"></span>') + 
        (ajaxparams['nav_type'] == 'recentphotos' ? '<span class="filter">' + filter_names[photo.filter]  + '</span>' + version : '') + 
        '<img src="' + (ajaxparams.collage ? (gcs.width > 360 * (window.devicePixelRatio || 1) ? photo.lrg_url : photo.med_url) : photo.thm_url) + '" alt="' + photo.title + '" '+ (ajaxparams.collage ? 'style="' + gcs.imgstyle + '"' : '') + ' class="notloaded" /></a>';
    }
    return '';
}


var getCollageSize = function(photo) {
    var column, columnstartadjust, columncols, i, minh, sizes, bigsizes, ret, imgsize, imgret, spacings;
    spacings = getspacings();
    column = 0;
    columncols = 1;
    columnstartadjust = 0;
    minh = CACHE['columns'][0];
    sizes = fitfillsize([ajaxparams.collagewidth,0],[photo.lrg_width,photo.lrg_height],'fit');
    for(i=0; i < CACHE['columns'].length; i++) {
        if(CACHE['columns'][i] < minh) {column = i; minh = CACHE['columns'][i]}
    }

    //now the spice - two column photos
    if(Math.random() > (photo.lrg_width > photo.lrg_height ? 0.4 : 0.9) && photo.lrg_width > 360) {
        if(CACHE['columns'][column] === CACHE['columns'][column+1]) {
            //double size!
            sizes = fitfillsize([ajaxparams.collagewidth * 2,0],[photo.lrg_width,photo.lrg_height],'fit');
            newcol = Math.max(CACHE['columns'][column + 1],CACHE['columns'][column]);
            columnstartadjust = 0;
            columncols = 2;
        }  else if(CACHE['columns'][column] === CACHE['columns'][column-1]) {
            //double size!
            sizes = fitfillsize([ajaxparams.collagewidth * 2,0],[photo.lrg_width,photo.lrg_height],'fit');
            newcol = Math.max(CACHE['columns'][column - 1],CACHE['columns'][column]);
            columnstartadjust = -1;
            columncols = 2;
        }
    }

    //now we do the cheating part. if the column on the side of the poster is close enough, we -modify- the poster to make it look tidy.
    //remember, if we change the vertical space, we have to resize the image in it in it in it.
    //NaN helps us nicely
    if(Math.abs(CACHE['columns'][column + columnstartadjust] + sizes[1] - CACHE['columns'][column + columnstartadjust - 1]) < ajaxparams.collagewidth / 5) {
        sizes[1] = CACHE['columns'][column + columnstartadjust - 1] - CACHE['columns'][column + columnstartadjust];
    } else if (Math.abs(CACHE['columns'][column + columnstartadjust] + sizes[1] - CACHE['columns'][column + columnstartadjust + columncols]) < ajaxparams.collagewidth / 5) {
        sizes[1] = CACHE['columns'][column + columnstartadjust + columncols] - CACHE['columns'][column + columnstartadjust];
    }

    ret = 'width:' + (sizes[0] - spacings.photospacing) + 'px; height:' + (sizes[1] - spacings.photospacing) + 'px; margin-left:'+ (column + columnstartadjust) * ajaxparams.collagewidth + 'px; margin-top:' + CACHE['columns'][column] + 'px; display: block;';
    for(i = column + columnstartadjust; i < column + columnstartadjust + columncols; i++) {
        CACHE['columns'][i] += sizes[1];
    }

    imgsize = fitfillsize([sizes[0] - spacings.photospacing,sizes[1] - spacings.photospacing],[photo.lrg_width,photo.lrg_height],'fill');
    imgret = 'width:' + imgsize[0] + 'px; height:' + imgsize[1] + 'px; margin-left:' + Math.round((sizes[0] - spacings.photospacing - imgsize[0])/2) + 'px; margin-top:' + Math.floor((sizes[1] - spacings.photospacing - imgsize[1])/2) + 'px;';

    return {"style": ret, "imgstyle": imgret, "width": sizes[0] - spacings.photospacing, "height": sizes[1] - spacings.photospacing};

}

var handleResize = function(isfirst) {
    var sideMargin, numberOfThumbnails, neww, newc, ww, ocw, spacings;
    ww = $(window).width();
    spacings = getspacings(ww);
    var numberOfThumbnails = $('#thumbnails a').length;
    if (numberOfThumbnails > 0 || ajaxparams['nav_type'] === 'recentphotos') {
        if(ajaxparams.collage) {
            ocw = ajaxparams.collagewidth;
            //write this on my tombstone:
            thumbSize = ajaxparams.collagewidth = spacings.collagesize;
            if(ajaxparams.collagewidth != ocw) {oldcolumns = -1;} //if the thumb size changed, we force repaint
            extrapadding = spacings.panelborder * 2 - spacings.photospacing;
            newc = Math.min(15, Math.floor((ww - spacings.contentpadding * 2 - extrapadding - (spacings.viralwidget ? 70 : 0)) / thumbSize));
        } else {
            thumbSize = spacings.thumbnailsize;
            extrapadding = 0;
            newc = Math.min(10, Math.floor((ww - spacings.contentpadding * 2 - spacings.photospacing - (spacings.viralwidget ? 70 : 0)) / thumbSize));
        }
        neww = newc * thumbSize;
        oldcolumns = CACHE['columns'].length;
        if(ajaxparams.collage) {
            if(oldcolumns == newc && ajaxparams.collagewidth == ocw) { return;}
            CACHE['columns'] = [];
            for(var i=0; i < newc; i++) {
                CACHE['columns'].push(0);
            }
            Math.seedrandom(Math.floor(new Date().getTime() / 1000 / 86400));
            $('#content').css({'margin': 'auto', 'width': neww + extrapadding});
            $('#thumbnails .thumbnail').each(function() {
                var photo, gcs, imgsize, img;
                photo = {lrg_width: $(this).data('width'), lrg_height: $(this).data('height')}
                gcs = getCollageSize(photo);
                if(isfirst && gcs.width > 360 * (window.devicePixelRatio || 1)) {
                    img = $(this).find('img').data('lrg_url');
                    $(this).attr('style', gcs.style).find('img').attr('style', gcs.imgstyle).attr('src', img);
                } else {
                    $(this).attr('style', gcs.style).find('img').attr('style', gcs.imgstyle);
                }
            });
            setTH();
            
            if(CACHE.loaded) {
                closeOff();
            }
        } else {
            $('#thumbnails_holder,#switcher,#thumbnails_header,.header_profile,.header_place,#sunset').width(newc * (spacings.thumbnailsize + spacings.photospacing) - spacings.photospacing);
        }
    } else {
        $('#content').css({'max-width':  720, 'margin': 'auto'})
    }
}

if(Modernizr.hybrid) {
    $('#thumbnails').on('click', 'a.thumbnail', function(e) {
        e.preventDefault();
        Android.openPhotoWithPostcard($(this).data('photo_id'), $(this).data('profile_id'), JSON.stringify(allthumbnails));
    });
    //this is for likes page - probably should be in a common hybrid.js
    $('#linktohome').trigger('refresh');
}

if(Modernizr.touch) {
    $(window).on('orientationchange', handleResize);
} else {
    $(window).on('resize', handleResize);
}
handleResize(true);
if (typeof(ajaxparams['oldestid']) != 'undefined' || ajaxparams['nav_type'] == 'recentphotos') {
    $(window).scroll(handleThumbs); //this needs to be toned down a bit
    handleThumbs();
}
})();