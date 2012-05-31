var carousel = carousel || {
    dom: $('#content_carousel'),
    maxwidth: 1400,
    sidemargin: parseFloat($('#content').css('padding-left'))
};

carousel.enabled = true;
carousel.spacing = typeof(carousel.spacing) == 'number' ? carousel.spacing : 3;
carousel.zoom = typeof(carousel.zoom) == 'number' ? carousel.zoom : 1.1;

carousel.torender = true;
carousel.solutions = [] //array of hashes where {photos: [array of ids to fill in right order], layout: 'string of brackets'}

carousel.lastsize = carousel.lastsize || [Math.min(carousel.maxwidth,$(window).width()),$(window).height()];

carousel.initori = carousel.initori || function() {
    carousel.orientation = carousel.lastsize[0] > carousel.lastsize[1] ? '<>' : '{}';
}

//width, height
carousel.init = carousel.init || function() {
    carousel.width = Math.min(carousel.maxwidth,carousel.lastsize[0] - carousel.sidemargin * 2);
    carousel.height = Math.floor(carousel.width * (carousel.orientation == '{}' ? Math.sqrt(2) : 1 / Math.sqrt(2)));
    if(!window.oriproblem) {return false;}
    problem = $.merge([],oriproblem);
    $('#thumbnails_holder').width(carousel.width);
    $('#outro').width(carousel.width - 2);

    $(carousel.dom).css({width: carousel.width, height: carousel.height});
    carousel.calculateSizes();
    return true;
};

carousel.calculateSizes = function() {
    carousel.sizes = [[carousel.width,carousel.height]]
    for(var i=1; i<20; i++) {
        if(i % 2 == (carousel.orientation == '<>' ? 1 : 0)) {
            carousel.sizes.push([(carousel.sizes[i-1][0] - carousel.spacing)/2,carousel.sizes[i-1][1]]);
        } else {
            carousel.sizes.push([carousel.sizes[i-1][0], (carousel.sizes[i-1][1] - carousel.spacing)/2]);
        }
    }
}
carousel.displayGoodSolution = carousel.displayGoodSolution || function() {
    if(!carousel.solutions.length) {return;}
    displaySolution(carousel.solutions[Math.min(carousel.solutions.length - 1,Math.floor(carousel.lastsize[0]/180))])
}

carousel.resizeCheck = carousel.resizeCheck || function() {
    if(!window.oriproblem || !window.problem) {return;}
    var newsize = [Math.min(carousel.maxwidth,$(window).width()),$(window).height()];
    carousel.sidemargin = parseFloat($('#content').css('padding-left'));
    if(newsize[0] > newsize[1] + 40 && carousel.orientation == '{}' || (newsize[1] > newsize[0] + 40 && carousel.orientation == '<>')) {
        //orientation has really changed. orientationchange event is practically useless in android, so we have to do this.
        carousel.initori();
        carousel.init();
        carousel.solutions = [];
        firstSolve();
        for(i=0;i<15;i++){
            nextSolve();
        }
        carousel.displayGoodSolution();
    } 
    if(Math.abs(carousel.lastsize[0] - newsize[0]) < 40) {
        return;
    }
    carousel.lastsize = newsize;
    if(carousel.torender) {
        carousel.init();
        carousel.displayGoodSolution();
        carousel.torender = false;
    }
}

//stuff is what we try to stuff into the thing - we're searching for them in the beginning of the problem string
//orientation is where we can put the stuff, we search for one of these in the current layout string
//fillwith is the exact way we want to stuff the stuff

//these are the initial strategies - the difference is when we stuff, we don't have to keep the old picture held in the space (there ain't one)
var initialSolvables = [
    {stuff: '<>', orientation: '<>',fillwith: ''},
    {stuff: '{}{}', orientation: '<>', fillwith: '{}{}'},
    {stuff: '{}', orientation: '{}',fillwith: ''},
    {stuff: '<><>', orientation: '{}', fillwith: '<><>'}
];
var intialRescue = [
    {stuff: '{}<>', replace: [0,1]},
    {stuff: '<>{}', replace: [0,1]}
];

//these are the strategies after step 1
//this array should be shouffled around sometimes - otherwise we try to do the same thing everytime
var nextSolvables = [ //  "[" brackets are portrait, "<" are landscape
    {stuff:'{}<>',orientation:'{}', fillwith: '<{}{}><>'},
    {stuff:'<>{}',orientation:'{}', fillwith: '<{}{}><>', flip: [0,1]}, //we have to flip the pictures to keep the orientation correct
    {stuff:'<><><>',orientation:'{}', fillwith: '<{}{<><>}><>'},
    {stuff:'{}{}{}',orientation:'{}', fillwith: '<{}{}><{}{}>'},
    {stuff:'<>{}',orientation:'<>', fillwith: '{<><>}{}'},
    {stuff:'{}<>',orientation:'<>', fillwith: '{<><>}{}', flip: [0,1]}, //
    {stuff:'{}{}{}',orientation:'<>', fillwith: '{<><{}{}>}{}'},
    {stuff:'<><><>',orientation:'<>', fillwith: '{<><>}{<><>}'}
];
var nextRescue = [
    {stuff: '{}{}<>{}', replace: [2,3]},
    {stuff: '<><>{}<>', replace: [2,3]},
    {stuff: '{}<><>', replace: [0,1]},
    {stuff: '<>{}{}', replace: [0,1]},
    {stuff: '<><>{}', replace: [0,2]},
    {stuff: '{}{}<>', replace: [0,2]}
];


var getOrientation = function(photo) {
    return photo.lrg_width > photo.lrg_height ? '<>' : '{}';
}

var problemToBrackets = function(problem) {
    var i, ret = '';
    for(i=0;i<problem.length;i++) {
        ret+= getOrientation(problem[i]);
    }
    return ret;
}

//console.log(problemToBrackets(problem),'INITIAL PROBLEM');

var firstSolve = function() {
    if(ajaxparams['username']) {
        Math.seedrandom(ajaxparams['username']);
    } else {
        Math.seedrandom(Math.floor(new Date().getTime() / 1000 / 86400));
    }
    var i, problemString;
    problemString = problemToBrackets(problem);
    i = initialSolvables.length - 1;
    while(i >= 0) {
        if(initialSolvables[i].orientation == carousel.orientation) {
            if(problemString.substr(0,initialSolvables[i].stuff.length) == initialSolvables[i].stuff) {
                carousel.solutions.push({
                    photos: problem.splice(0,initialSolvables[i].stuff.length / 2),
                    //layout: initialSolvables[i].orientation.substr(0,1) + initialSolvables[i].fillwith + initialSolvables[i].orientation.substr(1,1)
                    layout: initialSolvables[i].stuff
                })
                return;
            }
        }
        i-=1;
    }
    //if we're still here, we have to shuffle the first two values and try again. This will always work.
    //todo use the initialrescue array
    problem.unshift(problem.splice(1,1)[0]);
    return firstSolve();
}

var getDepths = function(layout) {
    //gets the depths (how small a photo currently is) from a layout. the bigger the depth, the smaller the picture
    var depth, i, currchar, nextchar, ret = [],photoindex = 0;
    if(layout.length == 2) {return [{charPosition: 0, depth: 0, orientation: layout, photoindex: 0}];}
    depth = 0;
    for(i=0;i<layout.length; i++) {
        currchar = layout.substr(i,1);
        nextchar = layout.substr(i+1,1);
        if(currchar == '{' || currchar == '<') {
            depth += 1
            if(nextchar == '}' || nextchar == '>') {
                ret.push({charPosition: i, depth: depth, orientation: currchar + nextchar, photoindex:photoindex});
                photoindex++;
            }
        } else if(currchar == '}' || currchar == '>') {
            depth -= 1;
        }
    }
    return ret;
}


var nextSolve = function() {
    var i, j, problemString, prevSolution, newSolution, prevPhotos, newPhotos, depths, possibleSolutions = [];
    problemString = problemToBrackets(problem);
    //console.log(problemString, 'PROBLEM');
    prevSolution = carousel.solutions[carousel.solutions.length - 1];
    depths = getDepths(prevSolution.layout);
    for(i=0; i < nextSolvables.length; i+=1) {
        //problem should start with stuff and previous solution sholud have a orientation.
        if(problemString.substr(0,nextSolvables[i].stuff.length) == nextSolvables[i].stuff) {
            for(j=0; j<depths.length; j+=1) {
                if(depths[j].orientation == nextSolvables[i].orientation) {
                    possibleSolutions.push({
                        solvable: nextSolvables[i],
                        depth: depths[j]
                    });
                }
            }

        }
    }
    if(possibleSolutions.length) {
        //we're sorting solutions by depth order (we want to put stuff to a shallow box)
        possibleSolutions.sort(function(a,b) {
            return a.depth.depth - b.depth.depth
        });
        //we're going to build possibleSolutions[0]
        if(Math.random() > .5) {
            rightSolution = possibleSolutions[Math.floor(Math.pow(Math.random(),4)*possibleSolutions.length)];
        } else {
            rightSolution = possibleSolutions[0];
        }
        newSolution = {};
        if(prevSolution.layout.length > 2) {
            newSolution.layout = prevSolution.layout.substr(0,rightSolution.depth.charPosition + 1) + rightSolution.solvable.fillwith + prevSolution.layout.substr(rightSolution.depth.charPosition + 1);
        } else {
            newSolution.layout = rightSolution.solvable.fillwith;
        }
        prevPhotos = $.merge([],prevSolution.photos);
        newPhotos = problem.splice(0,(rightSolution.solvable.stuff.length / 2));
        if(rightSolution.solvable.flip) {
            newPhotos[rightSolution.solvable.flip[0]] = newPhotos.splice(rightSolution.solvable.flip[1], 1, newPhotos[rightSolution.solvable.flip[0]])[0];
        }
        newSolution.photos = [];
        i = 0;
        while(prevPhotos.length) {
            newSolution.photos.push(prevPhotos.shift());
            if(i == rightSolution.depth.photoindex) {
                $.each(newPhotos, function(j,data) {
                    newSolution.photos.push(data);
                })
            }
            i++;
        }
        carousel.solutions.push(newSolution);
        return;
    }
    //console.log('RESCUE MODE ON');
    for(i=0;i<nextRescue.length; i++) {
        if(problemString.substr(0,nextRescue[i].stuff.length) == nextRescue[i].stuff) {
            problem[nextRescue[i].replace[0]]= problem.splice(nextRescue[i].replace[1], 1, problem[nextRescue[i].replace[0]])[0];
            //console.log(problemToBrackets(problem), 'MODIFIED PROBLEM');
            return nextSolve(); //to avoid further run
        }
    }
    //we're really clueless here.
}
var displaySolution = function(solution) {
    var cursor, depth, photoindex, i, currchar, nextchar, newp, keep = [],title,fs,picdims, showby, titlehtml, fracsizes, heart;
    cursor = [0,0];
    depth = 0;
    photoindex = 0;
    
    for(i = 0; i < solution.photos.length; i++) {
        keep.push('#' + solution.photos[i].id);
    }
    carousel.dom.find('div:not('+keep.join(',')+')').remove();
    showby = false;
    if(solution.photos.length > 1 && solution.photos[0].user.id != solution.photos[1].user.id ) {
        showby = true;
    }
    for(i=0;i<solution.layout.length; i++) {
        currchar = solution.layout.substr(i,1);
        nextchar = solution.layout.substr(i+1,1);
        if(currchar == '{' || currchar == '<') {
            if(solution.layout.length > 2) {depth += 1}
            if(nextchar == '}' || nextchar == '>') {
                //console.log('we should display something w/ following sizes: ',carousel.sizes[depth], 'starting from these coordinates:', $.merge([],cursor))
                fracsizes = [Math.round(cursor[0] + carousel.sizes[depth][0]) - Math.round(cursor[0]), Math.round(cursor[1] + carousel.sizes[depth][1]) - Math.round(cursor[1])];
                fs = fitfillsize([fracsizes[0], fracsizes[1]],[solution.photos[photoindex].lrg_width,solution.photos[photoindex].lrg_height],'fill');
                fs.push(((fracsizes[0] - fs[0]) / 2), (fracsizes[1] - fs[1]) / 3 );
                picdims = [fs[0] * carousel.zoom, fs[1] * carousel.zoom, fs[2] - (carousel.zoom - 1) / 2 * fs[0], fs[3] - (carousel.zoom - 1) / 2 * fs[1] ];
                if(!$('#' + solution.photos[photoindex].id).length) {
                    title = solution.photos[photoindex].title;
                    title = title.replace(new RegExp('"','g'),'&quot;');
                    titlehtml = '';
                    heart = '<span class="like' + (solution.photos[photoindex].like ? ' active' : '') + '" data-photoid="' + solution.photos[photoindex].id + '"></span>';
                    if(showby) {
                        title = title || 'Photo';
                        titlehtml = '<div class="carousel_title"><span class="padder">'+ title +' by <span style="font-weight:bold">'+solution.photos[photoindex].user.displayname + '</span></span></div>';
                    } else {
                        if(title) {
                            titlehtml = '<div class="carousel_title"><span class="padder">'+ title +'</span></div>';
                        }
                    }
                    carousel.dom.append('<div id="'+ solution.photos[photoindex].id + '" style="width:' + (fracsizes[0]) + 'px; height:' + (fracsizes[1]) + 'px; margin-left: ' + Math.round(cursor[0]) + 'px; margin-top:' + Math.round(cursor[1]) + 'px;" class="photos">' + 
                    '<a href="/'+solution.photos[photoindex].short_id+'">' +
                    heart +
                    titlehtml + 
                    '<img src="' + ((solution.photos[photoindex].med_url && fs[0] * fs[1] < solution.photos[photoindex].med_width * solution.photos[photoindex].med_height * 2) ? solution.photos[photoindex].med_url : solution.photos[photoindex].lrg_url) + '" style="width:' + picdims[0] + 'px; height:' + picdims[1] + 'px; margin-left: ' + picdims[2] + 'px; margin-top: ' + picdims[3] + 'px; ' + (!Modernizr.touch ? 'opacity:0' : '') + '"></a></div>');
                } else {
                    $('#' + solution.photos[photoindex].id).css({
                        'width': (fracsizes[0])+'px',
                        'height': (fracsizes[1])+'px',
                        'margin-left': Math.round(cursor[0]) + 'px',
                        'margin-top': Math.round(cursor[1]) + 'px'
                    }).find('img').css({
                        'width': picdims[0] + 'px',
                        'height': picdims[1] + 'px',
                        'margin-left': picdims[2] + 'px',
                        'margin-top': picdims[3] + 'px'
                    });
                }
                $('#' + solution.photos[photoindex].id).data('url', solution.photos[photoindex].short_id);
                photoindex += 1;
            }

        } else if(currchar == '}' || currchar == '>') {
            if(currchar == '}') {
                if(nextchar == '>') {
                    cursor[0] -= carousel.sizes[depth][0] + carousel.spacing;
                } else {
                    cursor[0] += carousel.sizes[depth][0] + carousel.spacing;
                }
            } else  if(currchar == '>'){
                if(nextchar == '}') {
                    cursor[1] -= carousel.sizes[depth][1] + carousel.spacing;
                } else {
                    cursor[1] += carousel.sizes[depth][1] + carousel.spacing;
                }
            }
            depth -= 1;
        }
    }
    if(!Modernizr.touch) {
        carousel.dom.find('img').load(function() {
            $(this).animate({opacity:1},300);
        });
    }

}


$(window).resize(function() {
    carousel.torender = true;
});

carousel.initori();
if(carousel.init()) {
    carousel.solutions = [];
    firstSolve();
    for(i=0;i<15;i++){
        nextSolve();
    }
}
carousel.displayGoodSolution();

setInterval(carousel.resizeCheck,100);
