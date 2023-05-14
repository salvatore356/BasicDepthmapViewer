/*
MIT Licensed

Copyright (c) 2014 Rafał Lindemann. http://panrafal.github.com/depthy
*/

PIXI.ColorMatrixFilter2 = function()
{
  'use strict';

  // set the uniforms
  var uniforms = {};

  uniforms.matrix = {type: 'mat4', value: [1,0,0,0,
                                   0,1,0,0,
                                   0,0,1,0,
                                   0,0,0,1]};
  uniforms.shift= {type: '4fv', value:  [0.0,0.0,0.0,0.0]}; 

  var fragmentSrc = [
    'precision mediump float;',
    'varying vec2 vTextureCoord;',
    //'varying vec4 vColor;',
    //'uniform float invert;',
    'uniform vec4 filterArea;',
    'uniform mat4 matrix;',
    'uniform vec4 shift;',
    'uniform sampler2D uSampler;',

    'void main(void) {',
    '   gl_FragColor = texture2D(uSampler, vTextureCoord) * matrix + shift;',
    '}'
  ].join("\r\n");

   PIXI.Filter.call(
      this,
      null,
      fragmentSrc, // fragment shader
      uniforms
    );

};

PIXI.ColorMatrixFilter2.prototype = Object.create(PIXI.Filter.prototype);
PIXI.ColorMatrixFilter2.prototype.constructor = PIXI.ColorMatrixFilter2;

/**
 * Sets the matrix of the color matrix filter
 *
 * @property matrix
 * @type Array and array of 16 numbers
 * @default [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
 */
Object.defineProperty(PIXI.ColorMatrixFilter2.prototype, 'matrix', {
  get: function() {
    return this.uniforms.matrix;
  },
  set: function(value) {
    this.uniforms.matrix = value;
  }
});

/**
 * Sets the constant channel shift
 *
 * @property shift
 * @type Array and array of 26 numbers
 * @default [0,0,0,0]
 */
Object.defineProperty(PIXI.ColorMatrixFilter2.prototype, 'shift', {
  get: function() {
    return this.uniforms.shift;
  },
  set: function(value) {
    this.uniforms.shift = value;
  }
});

PIXI.DepthDisplacementFilter = function(texture, sprite)
{

  // texture.baseTexture._powerOf2 = true;

const vertSrc = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform mat3 filterMatrix;

varying vec2 vTextureCoord;
varying vec2 vFilterCoord;

void main(void)
{
   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
   vFilterCoord = ( filterMatrix * vec3( aTextureCoord, 1.0)  ).xy;
   vTextureCoord = aTextureCoord;
}
`;

  var fragmentSrc = `
    precision mediump float;
    varying vec2 vTextureCoord;
    varying vec2 vFilterCoord;
    uniform sampler2D displacementMap;
    uniform sampler2D uSampler;
    uniform float scale;
    uniform vec2 offset;
    uniform vec4 dimensions;
    uniform vec2 mapDimensions;
    uniform float focus;
 
    void main(void) {
       float aspect = dimensions.x / dimensions.y;
       vec2 scale2 = vec2(scale * min(1.0, 1.0 / aspect), scale * min(1.0, aspect));
       vec2 mapCords = vTextureCoord;
       //mapCords.x *= -1.0;
       //mapCords.y += 1.0;
       float map = texture2D(displacementMap, mapCords).r;
       map = map * -1.0 + focus;
       vec2 disCords = vTextureCoord;
       disCords += offset * map * scale2;
       gl_FragColor = texture2D(uSampler, disCords);
    //    gl_FragColor = vec4(1,1,1,0.5);
    //    gl_FragColor *= texture2D(displacementMap, mapCords);
    }

  `;

   PIXI.Filter.call(
    this,
    vertSrc,
    fragmentSrc, // fragment shader
  );


  if(texture.baseTexture.valid)
  {
    this.uniforms.mapDimensions = [texture.width, texture.height];
  }
  else
  {
    this.uniforms.mapDimensions   = [1, 5112],
    this.boundLoadedFunction = this.onTextureLoaded.bind(this);
 
    texture.baseTexture.on('loaded', this.boundLoadedFunction);
  }



  this.uniforms.displacementMap = texture;
  this.uniforms.scale           = 0.015;
  this.uniforms.offset          = [0, 0];
  this.uniforms.focus           = 0.5;

  this.padding = 0;
  this.sprite = sprite;
  this.matrix = new PIXI.Matrix();

  this.apply = function(filterManager, input, output, clear)
  {
    this.uniforms.dimensions[0] = input.sourceFrame.width;
    this.uniforms.dimensions[1] = input.sourceFrame.height
    this.uniforms.filterMatrix = filterManager.calculateSpriteMatrix(this.matrix, this.sprite);

    // draw the filter...
    filterManager.applyFilter(this, input, output, clear);
  }
};
 
PIXI.DepthDisplacementFilter.prototype = Object.create( PIXI.Filter.prototype );
PIXI.DepthDisplacementFilter.prototype.constructor = PIXI.DepthDisplacementFilter;
 
PIXI.DepthDisplacementFilter.prototype.onTextureLoaded = function()
{
  this.uniforms.mapDimensions = [this.uniforms.displacementMap.width, this.uniforms.displacementMap.height];

 
  this.uniforms.displacementMap.baseTexture.off('loaded', this.boundLoadedFunction);
};
 
/**
 * The texture used for the displacemtent map * must be power of 2 texture at the moment
 *
 * @property map
 * @type Texture
 */
Object.defineProperty(PIXI.DepthDisplacementFilter.prototype, 'map', {
  get: function() {
    return this.uniforms.displacementMap;
  },
  set: function(value) {
    this.uniforms.displacementMap = value;
  }
});
 
/**
 * The multiplier used to scale the displacement result from the map calculation.
 *
 * @property scale
 * @type Point
 */
Object.defineProperty(PIXI.DepthDisplacementFilter.prototype, 'scale', {
  get: function() {
    return this.uniforms.scale;
  },
  set: function(value) {
    this.uniforms.scale = value;
  }
});
 
/**
 * Focus point in paralax
 *
 * @property focus
 * @type float
 */
Object.defineProperty(PIXI.DepthDisplacementFilter.prototype, 'focus', {
  get: function() {
    return this.uniforms.focus;
  },
  set: function(value) {
    this.uniforms.focus = Math.min(1,Math.max(0,value));
  }
});

/**
 * The offset used to move the displacement map.
 *
 * @property offset
 * @type Point
 */
Object.defineProperty(PIXI.DepthDisplacementFilter.prototype, 'offset', {
  get: function() {
    return this.uniforms.offset;
  },
  set: function(value) {
    this.uniforms.offset = [value.x,value.y];
  }
});

PIXI.DepthPerspectiveFilter = function(texture, quality, sprite)
  {
  
    var fragSrc = `
  // Copyright (c) 2014 Rafał Lindemann. http://panrafal.github.com/depthy
  precision mediump float;
  
  varying vec2 vTextureCoord;
  varying vec2 vFiterCoord;
  uniform sampler2D displacementMap;
  uniform sampler2D uSampler;
  uniform vec4 dimensions;
  uniform vec2 mapDimensions;
  uniform float scale;
  uniform vec2 offset;
  uniform float focus;
  
  #if !defined(QUALITY)
  
    #define METHOD 1
    #define CORRECT
  //     #define COLORAVG
    #define ENLARGE 1.5
    #define ANTIALIAS 1
    #define AA_TRIGGER 0.8
    #define AA_POWER 1.0
    #define AA_MAXITER 8.0
    #define MAXSTEPS 16.0
    #define CONFIDENCE_MAX 2.5
  
  #elif QUALITY == 2
  
    #define METHOD 1
    #define CORRECT
  //     #define COLORAVG
    #define MAXSTEPS 4.0
    #define ENLARGE 0.8
  //   #define ANTIALIAS 2
    #define CONFIDENCE_MAX 2.5
  
  #elif QUALITY == 3
  
    #define METHOD 1
    #define CORRECT
  //     #define COLORAVG
    #define MAXSTEPS 6.0
    #define ENLARGE 1.0
    #define ANTIALIAS 2
    #define CONFIDENCE_MAX 2.5
  
  #elif QUALITY == 4
  
    #define METHOD 1
    #define CORRECT
  //     #define COLORAVG
    #define MAXSTEPS 16.0
    #define ENLARGE 1.5
    #define ANTIALIAS 2
    #define CONFIDENCE_MAX 2.5
  
  #elif QUALITY == 5
  
    #define METHOD 1
    #define CORRECT
    #define COLORAVG
    #define MAXSTEPS 40.0
    #define ENLARGE 1.5
  //     #define ANTIALIAS 2
    #define AA_TRIGGER 0.8
    #define AA_POWER 1.0
    #define AA_MAXITER 8.0
    #define CONFIDENCE_MAX 4.5
  
  #endif
  
  
  #define BRANCHLOOP  
  #define BRANCHSAMPLE 
  #define DEBUG 0
  // #define DEBUGBREAK 2
  
  #ifndef METHOD
    #define METHOD 1
  #endif
  #ifndef MAXSTEPS
    #define MAXSTEPS 8.0
  #endif
  #ifndef ENLARGE
    #define ENLARGE 1.2
  #endif
  #ifndef PERSPECTIVE
    #define PERSPECTIVE 0.0
  #endif
  #ifndef UPSCALE
    #define UPSCALE 1.06
  #endif
  #ifndef CONFIDENCE_MAX
    #define CONFIDENCE_MAX 0.2
  #endif
  #ifndef COMPRESSION
    #define COMPRESSION 0.8
  #endif
  
  const float perspective = PERSPECTIVE;
  const float upscale = UPSCALE;
  // float steps = clamp( ceil( max(abs(offset.x), abs(offset.y)) * maxSteps ), 1.0, maxSteps);
  float steps = MAXSTEPS;
  
  #ifdef COLORAVG
  float maskPower = steps * 2.0;// 32.0;
  #else 
  float maskPower = steps * 1.0;// 32.0;
  #endif
  float correctPower = 1.0;//max(1.0, steps / 8.0);
  
  const float compression = COMPRESSION;
  const float dmin = (1.0 - compression) / 2.0;
  const float dmax = (1.0 + compression) / 2.0;
  
  const float vectorCutoff = 0.0 + dmin - 0.0001;
  
  float aspect = dimensions.x / dimensions.y;
  vec2 scale2 = vec2(scale * min(1.0, 1.0 / aspect), scale * min(1.0, aspect)) * vec2(1, 1) * vec2(ENLARGE);
  // mat2 baseVector = mat2(vec2(-focus * offset) * scale2, vec2(offset - focus * offset) * scale2);
  mat2 baseVector = mat2(vec2((0.5 - focus) * offset - offset/2.0) * scale2, 
                         vec2((0.5 - focus) * offset + offset/2.0) * scale2);
  
  
  void main(void) {
  
    vec2 pos = (vTextureCoord - vec2(0.5)) / vec2(upscale) + vec2(0.5);
    mat2 vector = baseVector;
    // perspective shift
    vector[1] += (vec2(2.0) * pos - vec2(1.0)) * vec2(perspective);
    
    float dstep = compression / (steps - 1.0);
    vec2 vstep = (vector[1] - vector[0]) / vec2((steps - 1.0)) ;
    
    #ifdef COLORAVG
      vec4 colSum = vec4(0.0);
    #else
      vec2 posSum = vec2(0.0);
    #endif
  
    float confidenceSum = 0.0;
    float minConfidence = dstep / 2.0;
      
    #ifdef ANTIALIAS
      #ifndef AA_TRIGGER
        #define AA_TRIGGER 0.8
      #endif
      #if ANTIALIAS == 11 || ANTIALIAS == 12
        #ifndef AA_POWER
          #define AA_POWER 0.5
        #endif
        #ifndef AA_MAXITER
          #define AA_MAXITER 16.0
        #endif
        float loopStep = 1.0;
      #endif
      
      #define LOOP_INDEX j
      float j = 0.0;
    #endif
  
    #ifndef LOOP_INDEX
      #define LOOP_INDEX i
    #endif
  
  
    for(float i = 0.0; i < MAXSTEPS; ++i) {
      vec2 vpos = pos + vector[1] - LOOP_INDEX * vstep;
      float dpos = 0.5 + compression / 2.0 - LOOP_INDEX * dstep;
      #ifdef BRANCHLOOP
      if (dpos >= vectorCutoff && confidenceSum < CONFIDENCE_MAX) {
      #endif
        float depth = 1.0 - texture2D(displacementMap, vpos).r;
        depth = clamp(depth, dmin, dmax);
        float confidence;
  
        #if METHOD == 1
          confidence = step(dpos, depth + 0.001);
  
        #elif METHOD == 2
          confidence = 1.0 - abs(dpos - depth);
          if (confidence < 1.0 - minConfidence * 2.0) confidence = 0.0;
  
        #elif METHOD == 5
          confidence = 1.0 - abs(dpos - depth);
          confidence = pow(confidence, maskPower);
  
        #endif
  
        #ifndef BRANCHLOOP
         confidence *= step(vectorCutoff, dpos);
         confidence *= step(confidenceSum, CONFIDENCE_MAX);
        #endif
          
        #ifndef ANTIALIAS
        #elif ANTIALIAS == 1 // go back halfstep, go forward fullstep - branched
          if (confidence > AA_TRIGGER && i == j) {
            j -= 0.5;
          } else {
            j += 1.0;
          }
          // confidence *= CONFIDENCE_MAX / 3.0;
  
        #elif ANTIALIAS == 2 // go back halfstep, go forward fullstep - mult
          j += 1.0 + step(AA_TRIGGER, confidence) 
               * step(i, j) * -1.5; 
          // confidence *= CONFIDENCE_MAX / 3.0;
  
        #elif ANTIALIAS == 11
          if (confidence >= AA_TRIGGER && i == j && steps - i > 1.0) {
            loopStep = AA_POWER * 2.0 / min(AA_MAXITER, steps - i - 1.0);
            j -= AA_POWER + loopStep;
          }
          confidence *= loopStep;
          j += loopStep;
        #elif ANTIALIAS == 12
          float _if_aa = step(AA_TRIGGER, confidence)
                       * step(i, j)
                       * step(1.5, steps - i);
          loopStep = _if_aa * (AA_POWER * 2.0 / min(AA_MAXITER, max(0.1, steps - i - 1.0)) - 1.0) + 1.0;
          confidence *= loopStep;
          j += _if_aa * -(AA_POWER + loopStep) + loopStep;
        #endif
  
          
        #ifdef BRANCHSAMPLE
        if (confidence > 0.0) {
        #endif
          
          #ifdef CORRECT
            #define CORRECTION_MATH +( ( vec2((depth - dpos) / (dstep * correctPower)) * vstep ))
          #else
            #define CORRECTION_MATH
          #endif
            
          #ifdef COLORAVG    
            colSum += texture2D(uSampler, vpos CORRECTION_MATH) * confidence;
          #else
            posSum += (vpos CORRECTION_MATH) * confidence;    
          #endif
            confidenceSum += confidence;
            
        #ifdef BRANCHSAMPLE
        }
        #endif
  
          
        #if DEBUG > 2
          gl_FragColor = vec4(vector[0] / 2.0 + 1.0, vector[1].xy / 2.0 + 1.0);
        #elif DEBUG > 1
          gl_FragColor = vec4(confidenceSum, depth, dpos, 0);
        #elif DEBUG > 0
          gl_FragColor = vec4(confidence, depth, dpos, 0);
        #endif
        #ifdef DEBUGBREAK 
        if (i == float(DEBUGBREAK)) {
            dpos = 0.0;
        }     
        #endif
  
      #ifdef BRANCHLOOP
      }
      #endif
    };
  
    #if defined(COLORAVG) && DEBUG == 0
      gl_FragColor = colSum / vec4(confidenceSum);
    #elif !defined(COLORAVG) && DEBUG == 0
      gl_FragColor = texture2D(uSampler, posSum / confidenceSum);
    #endif
  
  }
    `;
  
  
  const vertSrc = `
  attribute vec2 aVertexPosition;
  attribute vec2 aTextureCoord;
  
  uniform mat3 projectionMatrix;
  uniform mat3 filterMatrix;
  
  varying vec2 vTextureCoord;
  varying vec2 vFilterCoord;
  
  void main(void)
  {
     gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
     vFilterCoord = ( filterMatrix * vec3( aTextureCoord, 1.0)  ).xy;
     vTextureCoord = aTextureCoord;
  }
  `;
  
  
    this.quality = quality;
    if (quality) {
      fragSrc = '#define QUALITY ' + quality + "\r\n" + fragSrc;
    }
  
    PIXI.Filter.call(
      this,
      vertSrc,
      fragSrc, // fragment shader
    );
  
  
    this.padding = 0;
    this.sprite = sprite;
    this.matrix = new PIXI.Matrix();
  
    this.uniforms.displacementMap = texture;
    this.uniforms.scale = 0.015;
    this.uniforms.offset = [0.0,0.0];
    this.uniforms.focus = 0.5;
    this.uniforms.enlarge = 1.06;
  
  
  
    this.apply = function(filterManager, input, output, clear)
    {
      this.uniforms.dimensions[0] = input.sourceFrame.width;
      this.uniforms.dimensions[1] = input.sourceFrame.height;
      this.uniforms.filterMatrix = filterManager.calculateSpriteMatrix(this.matrix, this.sprite);
  
      // draw the filter...
      filterManager.applyFilter(this, input, output, clear);
    }
  
  };
   
  PIXI.DepthPerspectiveFilter.prototype = Object.create( PIXI.Filter.prototype );
  PIXI.DepthPerspectiveFilter.prototype.constructor = PIXI.DepthPerspectiveFilter;
   
  /**
   * The texture used for the displacemtent map * must be power of 2 texture at the moment
   *
   * @property map
   * @type Texture
   */
  Object.defineProperty(PIXI.DepthPerspectiveFilter.prototype, 'map', {
    get: function() {
      return this.uniforms.displacementMap;
    },
    set: function(value) {
      this.uniforms.displacementMap = value;
    }
  });
   
  /**
   * The multiplier used to scale the displacement result from the map calculation.
   *
   * @property scale
   * @type Point
   */
  Object.defineProperty(PIXI.DepthPerspectiveFilter.prototype, 'scale', {
    get: function() {
      return this.uniforms.scale;
    },
    set: function(value) {
      this.uniforms.scale = value;
    }
  });
   
  /**
   * Focus point in paralax
   *
   * @property focus
   * @type float
   */
  Object.defineProperty(PIXI.DepthPerspectiveFilter.prototype, 'focus', {
    get: function() {
      return this.uniforms.focus;
    },
    set: function(value) {
      this.uniforms.focus = Math.min(1,Math.max(0,value));
    }
  }); 
  
  /**
   * Image enlargment
   *
   * @property enlarge
   * @type float
   */
  Object.defineProperty(PIXI.DepthPerspectiveFilter.prototype, 'enlarge', {
    get: function() {
      return this.uniforms.enlarge;
    },
    set: function(value) {
      this.uniforms.enlarge = value;
    }
  });
  
  /**
   * The offset used to move the displacement map.
   *
   * @property offset
   * @type Point
   */
  Object.defineProperty(PIXI.DepthPerspectiveFilter.prototype, 'offset', {
    get: function() {
      return this.uniforms.offset;
    },
    set: function(value) {
      this.uniforms.offset = [value.x, value.y];
    }
  });

(function(root){
  'use strict';

  // HELPER FUNCTIONS
  const isNumber = (input) => {
    return (input - 0) == input && (''+input).trim().length > 0;
  }
  var Promise = (root.Q && root.Q.Promise) || (root.RSVP && root.RSVP.Promise) || root.Promise;

  var defaultOptions = {
      // preferred viewport size {width, height}
      size: null,
      sizeDivisible: 1,
      // auto fitting: false, 'cover', 'contain'. False will disable retina and upscale
      fit: 'cover',
      // allow 2x upscale
      retina: true,
      // maximum upscaling to fit in viewport (through canvas stretching)
      upscale: 1,
      // image enlargment to protect from overflowing edges
      enlarge: 1.06,

      // animation options
      animate: true,
      animateDuration: 6,
      animatePosition: null,
      animateScale: {x: 1.5, y: 1.5},

      depthScale: 2,
      depthBlurSize: 4,
      depthFocus: 0.5,
      depthPreview: 0,

      easeFactor: 0.4,

      orient: 2,

      hover: false,
      // element to control mouse movements
      hoverElement: false,

      // 1, 2, 3, 4, 5 or false for auto
      quality: false,
      qualityMin: 1,
      qualityMax: 5,
      qualityStart: 4,

      alwaysRender: true,
      pauseRender: false,
    };

  var DepthyViewer = root.DepthyViewer = function(element, options) {
    var self = this,
        canvas, app, stage, renderer, stats,
        image = {}, depth = {},
        sizeDirty = true, stageDirty = true, renderDirty = true, depthFilterDirty = true, 
        discardAlphaFilter, resetAlphaFilter, invertedAlphaToRGBFilter, discardRGBFilter, invertedRGBToAlphaFilter, depthBlurFilter, grayscaleFilter,
        stageSize, stageSizeCPX,
        // renderUpscale = 1.05,
        readyResolver,
        quality = {current: options.qualityStart || 4, dirty: true, provenSlow: {}},

        imageTextureSprite, imageTextureContainer, imageRender,
        depthTextureSprite, depthTextureContainer, depthRender,

        depthFilter, compoundSprite, previewSprite,

        depthOffset = {x: 0, y: 0}, easedOffset = depthOffset;

    options = defaultOptions;

    // PRIVATE FUNCTIONS
    function init() {
      initRenderer();
      if (renderer) requestAnimationFrame( renderLoop );
    }

    function initRenderer() {
      try {
        app = new PIXI.Application({width: 800, height:600,backgroundColor : 0x1099bb});
        element.appendChild(app.view);

        stage = app.stage;
        renderer = app.renderer;
        canvas = renderer.view;

        discardAlphaFilter = createDiscardAlphaFilter();
        resetAlphaFilter = createDiscardAlphaFilter(1.0);
        invertedAlphaToRGBFilter = createInvertedAlphaToRGBFilter();
        discardRGBFilter = createDiscardRGBFilter();
        invertedRGBToAlphaFilter = createInvertedRGBToAlphaFilter();
        depthBlurFilter = createDepthBlurFilter();
        grayscaleFilter = createGrayscaleFilter();
      } catch (e) {
        console.error('WebGL failed', e);
        renderer = false;
      }

    }


    function createDiscardAlphaFilter(alphaConst) {
      var filter = new PIXI.ColorMatrixFilter2();
      filter.matrix = [1.0, 0.0, 0.0, 0.0,
                       0.0, 1.0, 0.0, 0.0,
                       0.0, 0.0, 1.0, 0.0,
                       0.0, 0.0, 0.0, 0.0];
      filter.shift =  [0.0, 0.0, 0.0, alphaConst || 0.0];
      return filter;
    }

    function createDiscardRGBFilter() {
      var filter = new PIXI.ColorMatrixFilter2();
      filter.matrix = [0.0, 0.0, 0.0, 0.0,
                       0.0, 0.0, 0.0, 0.0,
                       0.0, 0.0, 0.0, 0.0,
                       0.0, 0.0, 0.0, 1.0];
      filter.shift =  [0.0, 0.0, 0.0, 0.0];
      return filter;
    }

    function createInvertedAlphaToRGBFilter() {
      // move inverted alpha to rgb, set alpha to 1
      var filter = new PIXI.ColorMatrixFilter2();
      filter.matrix = [0.0, 0.0, 0.0,-1.0,
                       0.0, 0.0, 0.0,-1.0,
                       0.0, 0.0, 0.0,-1.0,
                       0.0, 0.0, 0.0, 0.0];
      filter.shift =  [1.0, 1.0, 1.0, 1.0];
      return filter;
    }

    function createInvertedRGBToAlphaFilter() {
      // move inverted alpha to rgb, set alpha to 1
      var filter = new PIXI.ColorMatrixFilter2();
      filter.matrix = [0.0, 0.0, 0.0, 0.0,
                       0.0, 0.0, 0.0, 0.0,
                       0.0, 0.0, 0.0, 0.0,
                      -1.0, 0.0, 0.0, 0.0];
      filter.shift =  [0.0, 0.0, 0.0, 1.0];
      return filter;
    }

    function createGrayscaleFilter() {
      // move inverted alpha to rgb, set alpha to 1
      var filter = new PIXI.ColorMatrixFilter2();
      filter.matrix = [0.333, 0.333, 0.333, 0.0,
                       0.333, 0.333, 0.333, 0.0,
                       0.333, 0.333, 0.333, 0.0,
                       0.0, 0.0, 0.0, 1.0];

      return filter;
    }

    function createDepthBlurFilter() {
      return new PIXI.filters.BlurFilter();
    }

    function sizeCopy(size, expand) {
      expand = expand || 1;
      return {width: size.width * expand, height: size.height * expand};
    }

    function sizeFit(size, max, cover) {
      var ratio = size.width / size.height;
      size = sizeCopy(size);
      if (cover && size.height < max.height || !cover && size.height > max.height) {
        size.height = max.height;
        size.width = size.height * ratio;
      }
      if (cover && size.width < max.width || !cover && size.width > max.width) {
        size.width = max.width;
        size.height = size.width / ratio;
      }
      return size;
    }

    function sizeRound(size) {
      return {
        width: Math.round(size.width),
        height: Math.round(size.height)
      };
    }

    function sizeFitScale(size, max, cover) {
      if (cover) {
        return max.width / max.height > size.width / size.height ?
          max.width / size.width :
          max.height / size.height;
      } else {
        return max.width / max.height > size.width / size.height ?
          max.height / size.height :
          max.width / size.width;
      }
    }

    function isReady() {
      return !!(renderer !== false && image.texture && image.size && (!depth.texture || depth.size));
    }

    // true when image and depth use the same texture...
    function isTextureShared() {
      return image.texture && depth.texture && image.texture === depth.texture;
    }

    function hasImage() {
      return !!image.texture;
    };

    function hasDepthmap() {
      return !!depth.texture;
    };


    function changeTexture(old, source) {
      if ((old.texture === source)|| old.url === source) return old;
      var current = {
        dirty: true
      };
      current.promise = new Promise(function(resolve, reject) {
        if (source) {
          if (source instanceof PIXI.RenderTexture) {
            current.texture = source;
          } else {
            current.texture = PIXI.Texture.from(source);
            current.url = source;
          }
          current.texture.baseTexture.premultipliedAlpha = false;
          if (current.texture.baseTexture.valid) {
            current.size = current.texture.frame;
            sizeDirty = true;
            resolve(current);
          } else {
            current.texture.addListener('update', function() {
              if (!current.texture) return;
              current.size = current.texture.frame;
              sizeDirty = true;
              resolve(current);
            });
            current.texture.baseTexture.source.onerror = function(error) {
              if (!current.texture) return;
              console.error('Texture load failed', error);
              current.error = true;
              current.texture.destroy(true);
              delete current.texture;
              reject(error);
            };
          }
        } else {
          console.log('Empty texture!');
          resolve(current);
        }
        // free up mem...
        if (old) {
          if (old.texture && !isTextureShared() && !old.shared) {
            old.texture.destroy(true);
          }
          old.texture = null;
        }
      });
      return current;
    }


    function updateSize() {

      var size =  {
        width:  window.innerWidth ,
        height: window.innerWidth/2,
        left: 0,
        transform: 'translateX(0)'
          // 
      };
      
      if (window.innerWidth < window.innerHeight) {
        size =  {
          width:  window.innerHeight ,
          height: window.innerHeight,
          left: '50%',
          transform: 'translateX(-50%)'
        };
      }

      stageSize = size;

      // remember target size
      stageSizeCPX = sizeRound(stageSize);

      // retina

      // don't upscale the canvas beyond image size

      canvas.style.width =  size.width;
      canvas.style.height = size.height;
      canvas.style.left = size.left;
      canvas.style.position = 'absolute';
      canvas.style.transform = size.transform
      //canvas.style.marginTop = Math.round(stageSizeCPX.height / -2) + 'px';

      if (renderer && (renderer.width !== stageSize.width || renderer.height !== stageSize.height)) {
        renderer.resize(stageSize.width, stageSize.height);
        image.dirty = depth.dirty = true;
        stageDirty = true;
      }

      sizeDirty = false;
    }

    function updateImageTexture() {
      var scale = sizeFitScale(image.size, stageSize, true);

      // prepare image render
      imageTextureSprite = new PIXI.Sprite(image.texture);
      imageTextureSprite.scale.set(scale, scale);

      imageTextureSprite.anchor.set(0.5, 0.5);
      imageTextureSprite.position.set(stageSize.width / 2, stageSize.height / 2);

      // discard alpha channel
      //imageTextureSprite.filters = [discardAlphaFilter];

      imageTextureContainer = new PIXI.Container();
      imageTextureContainer.addChild(imageTextureSprite);

      if (imageRender && (imageRender.width !== stageSize.width || imageRender.height !== stageSize.height)) {
        // todo: pixi errors out on this... why?
        // imageRender.resize(stageSize.width, stageSize.height);
        imageRender.destroy(true);
        imageRender = null;
      }
      imageRender = imageRender || new PIXI.RenderTexture.create(stageSize.width, stageSize.height);
      
      image.dirty = false;
      image.renderDirty = stageDirty = true;
    }

    function renderImageTexture() {
      renderer.render(imageTextureContainer, imageRender);
      image.renderDirty = false;
      renderDirty = true;
    }

    function updateDepthTexture() {
      var scale = depth.size ? sizeFitScale(depth.size, stageSize, true) : 1;

      depthTextureContainer = new PIXI.Container();

      if (hasDepthmap()) {
        // prepare depth render / filter
        depthTextureSprite = new PIXI.Sprite(depth.texture);
        depthTextureSprite.filters = [depthBlurFilter];
        depthTextureSprite.scale.set(scale, scale);
        depthTextureSprite.renderable = !!depth.texture;

        depthTextureSprite.anchor.set(0.5, 0.5);
        depthTextureSprite.position.set(stageSize.width / 2, stageSize.height / 2);

        if (depth.useAlpha) {
          // move inverted alpha to rgb, set alpha to 1
          depthTextureSprite.filters.push(invertedAlphaToRGBFilter);
          depthTextureSprite.filters = depthTextureSprite.filters;
        }
        depthTextureContainer.addChild(depthTextureSprite);
      } else {
        depthTextureSprite = null;
      }


      if (depthRender && (depthRender.width !== stageSize.width || depthRender.height !== stageSize.height)) {
        depthRender.destroy(true);
        depthRender = null;
      }
      depthRender = depthRender || new PIXI.RenderTexture.create(stageSize.width, stageSize.height);

      depth.dirty = false;
      depth.renderDirty = stageDirty = true;
    }

    function renderDepthTexture() {
      depthBlurFilter.blur = options.depthBlurSize;
      renderer.render(depthTextureContainer, depthRender);
      depth.renderDirty = false;
      renderDirty = true;
    }


    var depthFiltersCache = {};
    function updateStage() {
      // combine image with depthmap
      var q = options.quality || quality.current;

      if (previewSprite) stage.removeChild(previewSprite);
      previewSprite = new PIXI.Sprite(depthRender);
      previewSprite.renderable = false;
      

      //previewSprite.renderable = false;
      stage.addChild(previewSprite);

      if (!depthFilter || depthFilter.quality !== q) {

        //depthFilter = new PIXI.DepthDisplacementFilter(depth.texture, previewSprite);
        //depthFilter = new PIXI.DepthTestFilter(depth.texture, previewSprite);

        depthFiltersCache[q] = depthFilter = depthFiltersCache[q] || 
            (q === 1 ? new PIXI.DepthDisplacementFilter(depthRender)
                    : new PIXI.DepthPerspectiveFilter(depth.texture, q, previewSprite));
        depthFilter.quality = q;
        //depthFilter = new PIXI.DepthDisplacementFilter(depthRender);
      }
      if (depthFilter.map !== depthRender) {
        depthFilter.map = depthRender;
      }

      if (depthFilter.sprite !== previewSprite) {
        depthFilter.sprite = previewSprite;
        depthFilter.map = previewSprite._texture;
      }

      if (compoundSprite) {
        stage.removeChild(compoundSprite);
      }

      compoundSprite = new PIXI.Sprite(imageRender);
      compoundSprite.filters= [depthFilter];
      stage.addChildAt(compoundSprite,0);


      stageDirty = false;
      renderDirty = depthFilterDirty = true;
      quality.dirty = true;
    }

    function updateDepthFilter() {
      depthFilter.scale = 0.02 * (options.depthScale);

      depthFilter.offset = {
        x : easedOffset.x || 0,
        y : easedOffset.y || 0
      };
      depthFilter.focus = options.depthFocus;
      depthFilter.enlarge = options.enlarge;

      previewSprite.visible = options.depthPreview != 0;
      previewSprite.alpha = options.depthPreview;

      depthFilterDirty = false;
      renderDirty = true;
    }

    function updateOffset() {
      //console.log(depthOffset);
      if (depthOffset.x !== easedOffset.x || depthOffset.y !== easedOffset.y) {
        
        if (options.easeFactor && !options.animate) {
          easedOffset.x = easedOffset.x * options.easeFactor + depthOffset.x * (1-options.easeFactor);
          easedOffset.y = easedOffset.y * options.easeFactor + depthOffset.y * (1-options.easeFactor);
          if (Math.abs(easedOffset.x - depthOffset.x) < 0.0001 && Math.abs(easedOffset.y - depthOffset.y) < 0.0001) {
            easedOffset = depthOffset;
          }
        } else {
          easedOffset = depthOffset;
        }

        depthFilter.offset = {
          x : easedOffset.x,
          y : easedOffset.y
        };

        renderDirty = true;
      }

    }

    function updateAnimation() {
      if (true) {
        var now = isNumber(options.animatePosition) ?
                    options.animatePosition * options.animateDuration * 1000
                    : (window.performance && window.performance.now ? window.performance.now() : new Date().getTime());
        depthFilter.offset = {
          x : Math.sin(now * Math.PI * 2 / options.animateDuration / 1000) * options.animateScale.x,
          y : Math.cos(now * Math.PI * 2 / options.animateDuration / 1000) * options.animateScale.y
        };

        renderDirty = true;
      }
    }

    function changeQuality(q) {
      quality.measured = true;
      q = Math.max(options.qualityMin, Math.min(options.qualityMax, q));
      
      if (q > quality.current && quality.provenSlow[q] && stageSize.width * stageSize.height >= quality.provenSlow[q]) {
        //console.warn('Quality %d proven to be slow for size %d >= %d at %d', q, stageSize.width * stageSize.height, quality.provenSlow[q], quality.avg);
      } else {
        //console.warn('Quality change %d -> %d at %d fps', quality.current, q, quality.avg);
        quality.current = q;
        stageDirty = true;
      }
      
      updateDebug();
    }

    function updateQuality() {
      if (!hasDepthmap() || !hasImage() || options.quality) return;
      if (quality.dirty) {
        
        quality.count = quality.slow = quality.fast = quality.sum = 0;
        quality.measured = false;
        quality.dirty = false;
        updateDebug();
      }
      quality.count++;
      quality.fps = 1000 / quality.ms;
      quality.sum += quality.fps;
      quality.avg = quality.sum / quality.count;
      if (quality.fps < 10) { // 20fps
        quality.slow++;
      } else if (quality.fps > 58) { // 50fps
        quality.fast++;
      }
      
      // console.log('Quality ', quality);

      if (quality.slow > 5 || (quality.count > 15 && quality.avg < (quality.current > 4 ? 55 : 25))) {
        // quality 5 is slow below 55
        // log this stagesize as slow...
        if (!options.quality) quality.provenSlow[quality.current] = stageSize.width * stageSize.height;
        changeQuality(quality.current - 1);
      } else if (/*quality.fast > 30 ||*/ quality.count > 40 && quality.avg > (quality.current > 3 ? 55 : 50)) {
        // quality 4 is fast above 55
        // log this 
        changeQuality(quality.current + 1);
      } else if (quality.count > 60) {
        changeQuality(quality.current);
      } else {
        // render a bit more please...
        renderDirty = true;
      }
    }

    function updateDebug() {
      if (stats) {
        stats.domElement.className = 'q' + quality.current + (quality.measured ? '' : ' qm');
        stats.infoElement.textContent = 'Q' + (options.quality || quality.current) + (quality.measured ? '' : '?') + ' <' + quality.slow + ' >' + quality.fast + ' n' + quality.count + ' ~' + Math.round(quality.avg);
      }
    }

    function renderStage() {
      renderer.render(stage);
      renderDirty = false;
    }

    function update() {
      if (sizeDirty) updateSize();

      if (image.dirty) updateImageTexture();
      if (image.renderDirty) renderImageTexture();

      if (depth.dirty) updateDepthTexture();
      if (depth.renderDirty) renderDepthTexture();

      if (stageDirty) updateStage();
      if (depthFilterDirty) updateDepthFilter();

      if (hasDepthmap()) {
        updateOffset();
        updateAnimation();
      }

      if (readyResolver) {
        readyResolver();
        readyResolver = null;
      }
    }

    function render() {
      if (!isReady()) return;

      update();

      if (renderDirty || options.alwaysRender) {
        renderStage();
      }

      if (quality.dirty || !quality.measured) {
        updateQuality();
      }
      
    }

    var lastLoopTime = 0;
    function renderLoop() {
      if (!options.pauseRender) {
        quality.ms = lastLoopTime && (performance.now() - lastLoopTime);
        lastLoopTime = performance.now();

        stats && stats.begin();
        render();
        stats && stats.end();
      }
      requestAnimationFrame( renderLoop );
    }

    // PUBLIC FUNCTIONS

    this.setOptions = function(newOptions) {
      for(var k in newOptions) {
        if (options[k] === newOptions[k]) continue;
        options[k] = newOptions[k];
        switch(k) {
          case 'size':
          case 'fit':
          case 'retina':
          case 'upscale':
            sizeDirty = true;
            break;
          case 'quality':
            stageDirty = true;
            updateDebug();
            break;
          case 'depthScale':
          case 'depthFocus':
          case 'depthPreview':
            depthFilterDirty = true;
            break;
          case 'depthBlurSize':
            depth.renderDirty = true;
            break;
          default:
            renderDirty = true;
        }
      }
    };

    this.getOptions = function() {
      var oc = {};
      for(var k in options) oc[k] = options[k];
      return oc;
    };

    this.getElement = function() {
      return element;
    };

    this.getCanvas = function() {
      return canvas;
    };

    this.getRenderer = function() {
      return renderer;
    };

    this.getSize = function() {
      return sizeCopy(stageSize);
    };

    this.getSizeCPX = function() {
      return sizeCopy(stageSizeCPX);
    };

    this.getQuality = function() {
      return quality.current;
    };

    /** Returns a promise resolved when the viewer is ready, or rejected when any of the images are missing or failed on load.
        @param resolvedOnly TRUE - only wait for the isReady() to become true. Otherwise, the promise may be rejected
               but will be reset every time you change any of the images.
     */
    this.getPromise = function(resolvedOnly) {
      if (!resolvedOnly && (!this.hasImage() || this.getLoadError())) {
        return Promise.reject();
      }
      if (isReady()) {
        return Promise.resolve();
      }
      if (!readyResolver) {
        var promise = new Promise(function(resolve) {
          readyResolver = resolve;
        });
        readyResolver.promise = promise;
      }
      return resolvedOnly ? readyResolver.promise : Promise.all( [image.promise, depth.promise, readyResolver.promise] );
    };

    this.setImage = function(source) {
      image = changeTexture(image, source);
      return image.promise;
    };

    this.getImage = function() {
      return image;
    };

    this.setDepthmap = function(source, useAlpha) {
      depth = changeTexture(depth, source);
      depth.useAlpha = !!useAlpha;
      return depth.promise;
    };

    this.getDepthmap = function() {
      return depth;
    };

    this.render = render;

    this.reset = function() {
      this.setImage();
      this.setDepthmap();
    };

    this.hasImage = hasImage;

    this.hasDepthmap = hasDepthmap;

    this.getLoadError = function() {
      return image.error || depth.error;
    };

    this.setOffset = function(offset) {
      depthOffset = offset;
    };

    this.screenToImagePos = function(pos, clamp) {
      var rect = canvas.getBoundingClientRect();
      pos = {x: pos.x, y: pos.y};
      pos.x = (pos.x - rect.left) / rect.width;
      pos.y = (pos.y - rect.top) / rect.height;
      if (clamp) {
        pos.x = Math.max(0, Math.min(1, pos.x));
        pos.y = Math.max(0, Math.min(1, pos.y));
      }
      return pos;
    };

    /** Exports image + depthmap as PNG file. Returns promise */
    this.exportToPNG = function(maxSize) {

      return this.getPromise().then(
        function() {
          if (!hasDepthmap()) return false;

          var size = sizeRound(sizeFit(image.size, maxSize || image.size)),
              localstage = new PIXI.Stage(),
              scale = size.width / image.size.width,
              depthScale = size.width / depth.size.width,
              // we need unmultiplied canvas for this... 
              // it uploads images to the GPU once again, and won't work with local textures, but... well...
              localrenderer = new PIXI.WebGLRenderer(size.width, size.height, null, 'notMultiplied', true);

          var imageSprite = new PIXI.Sprite(image.texture);
          imageSprite.scale = new PIXI.Point(scale, scale);
          localstage.addChild(imageSprite);

          // discard alpha channel
          imageSprite.filters = [createDiscardAlphaFilter()];
          console.log(depth.texture);
          var depthSprite = new PIXI.Sprite(depth.texture);
          depthSprite.scale = new PIXI.Point(depthScale, depthScale);
          depthSprite.filters = [depth.useAlpha ? createDiscardRGBFilter() : createInvertedRGBToAlphaFilter()];

          // copy alpha using custom blend mode
          PIXI.blendModesWebGL['one.one'] = [localrenderer.gl.ONE, localrenderer.gl.ONE];
          depthSprite.blendMode = 'one.one';

          localstage.addChild(depthSprite);

          localrenderer.render(localstage);
          var dataUrl = localrenderer.view.toDataURL('image/png');

          try {
            localrenderer.destroy();
          } catch(e) {
            console.error('Render destroy error', e);
          }
          return dataUrl;
        }
      );
    };


    function exportTexture(source, options) {
      return source.promise.then(
        function() {
          if (!source.texture) {
            return false;
          } else if (options.allowDirect && source.url) {
            return source.url;
          } else {
            var size = sizeCopy(options.size || source.size);
            if (options.maxSize) size = sizeFit(size, options.maxSize);
            if (options.minSize) size = sizeFit(size, options.minSize, true);
            size = sizeRound(size);

            var localstage = new PIXI.Stage(),
                scale = sizeFitScale(source.size, size, true),
                renderTexture = new PIXI.RenderTexture(size.width, size.height);

            var sourceSprite = new PIXI.Sprite(source.texture);
            if (options.filters) sourceSprite.filters = options.filters;
            sourceSprite.scale = new PIXI.Point(scale, scale);
            sourceSprite.anchor = {x: 0.5, y: 0.5};
            sourceSprite.position = {x: size.width / 2, y: size.height / 2};

            localstage.addChild(sourceSprite);

            renderTexture.render(localstage, null, true);
            var canvas = PIXI.glReadPixelsToCanvas(renderer.gl, renderTexture, 0, 0, renderTexture.width, renderTexture.height),
                dataUrl = canvas.toDataURL(options.type || 'image/jpeg', options.quality || undefined);

            try {
              renderTexture.destroy();
            } catch(e) {
              console.error('Render destroy error', e);
            }
            return dataUrl;
          }
        }
      );
    }

    
    this.exportDepthmapAsTexture = function(maxSize) {
      var size = sizeCopy(image.size);
      if (maxSize) size = sizeFit(size, maxSize);
      size = sizeRound(size);

      var texture = new PIXI.RenderTexture(size.width, size.height);

      var container = new PIXI.Container();
      if (hasDepthmap()) {
        var scale = sizeFitScale(depth.size, size, true);
        
        var sprite = new PIXI.Sprite(depth.texture);
        sprite.scale = new PIXI.Point(scale, scale);
        sprite.anchor = {x: 0.5, y: 0.5};
        sprite.position = {x: size.width / 2, y: size.height / 2};
        if (depth.useAlpha) {
          sprite.filters = [invertedAlphaToRGBFilter];
        } else {
          sprite.filters = [grayscaleFilter];
        }
        container.addChild(sprite);
      } else {
        // flat is in the back
        var graphics = new PIXI.Graphics();
        graphics.beginFill(0xFFFFFF, 1);
        graphics.drawRect(0, 0, size.width, size.height);
        container.addChild(graphics);
      }

      texture.render(container, null, true);
      return texture;
    };

    /** Exports thumbnail as JPG file. Returns promise */
    this.exportThumbnail = function(size, quality) {
      size = size || {width: 50, height: 50};
      return this.getPromise().then(
        function() {
          var localstage = new PIXI.Stage(),
              scale = sizeFitScale(image.size, size, true),
              renderTexture = new PIXI.RenderTexture(size.width, size.height);

          var imageSprite = new PIXI.Sprite(image.texture);
          imageSprite.scale = new PIXI.Point(scale, scale);
          imageSprite.anchor = {x: 0.5, y: 0.5};
          imageSprite.position = {x: size.width / 2, y: size.height / 2};
          localstage.addChild(imageSprite);

          // discard alpha channel
          imageSprite.filters = [resetAlphaFilter];

          renderTexture.render(localstage, null, true);
          var canvas = PIXI.glReadPixelsToCanvas(renderer.gl, renderTexture, 0, 0, renderTexture.width, renderTexture.height),
              dataUrl = canvas.toDataURL('image/jpeg', quality);


          try {
            renderTexture.destroy();
          } catch(e) {
            console.error('Render destroy error', e);
          }
          return dataUrl;
        }
      );
    };

    this.exportAnaglyph = function(exportOpts) {
      return this.getPromise().then(
        function() {

          var size = sizeCopy(exportOpts.size || image.size);
          if (exportOpts.maxSize) size = sizeFit(size, exportOpts.maxSize);
          if (exportOpts.minSize) size = sizeFit(size, exportOpts.minSize, true);
          size = sizeRound(size);

          var oldOptions = self.getOptions();

          self.setOptions({
            animate: false,
            size: size,
            fit: false,
            orient: false,
            hover: false,
            depthPreview: 0,
            quality: 5,
          });

          // enforce settings
          update();

          var localstage = new PIXI.Stage(),
              leftEye, rightEye, filter;

          leftEye = compoundSprite;
          depthFilter.offset = {x: -1, y: 0.5};
          filter = new PIXI.ColorMatrixFilter2();
          filter.matrix = [1.0, 0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0, 0.0,
                           0.0, 0.0, 0.0, 1.0];
          leftEye.filters.push(filter);
          leftEye.filters = leftEye.filters;
          localstage.addChild(leftEye);

          // right eye
          compoundSprite = null;
          depthFilter = new PIXI.DepthPerspectiveFilter(depthRender, options.quality); // independent copy
          depthFilter.quality = options.quality; // enforce it
          updateStage(); // recreate sprite
          updateDepthFilter();

          rightEye = compoundSprite;
          depthFilter.offset = {x: 1, y: 0.5};
          filter = new PIXI.ColorMatrixFilter2();
          filter.matrix = [0.0, 0.0, 0.0, 0.0,
                           0.0, 1.0, 0.0, 0.0,
                           0.0, 0.0, 1.0, 0.0,
                           0.0, 0.0, 0.0, 1.0];
          rightEye.filters.push(filter);
          rightEye.filters = rightEye.filters;

          PIXI.blendModesWebGL['one.one'] = [renderer.gl.ONE, renderer.gl.ONE];
          rightEye.blendMode = 'one.one';

          // rightEye.blendMode = PIXI.blendModes.NORMAL;
          localstage.addChild(rightEye);

          // render...
          renderer.render(localstage);
          // store
          var dataUrl = canvas.toDataURL('image/jpeg', exportOpts.quality || 0.9);

          // done!
          compoundSprite = null;
          depthFilter = null;

          self.setOptions(oldOptions);
          // make full render cycle
          render();

          return dataUrl;
        }
      );
    };

    this.enableDebug = function() {
      if (window.Stats) {
        stats = new window.Stats();
        stats.setMode(0); // 0: fps, 1: ms
        stats.infoElement = document.createElement( 'div' );
        stats.infoElement.className = 'info';
        stats.domElement.appendChild(stats.infoElement);
        document.body.appendChild( stats.domElement );
        updateDebug();
      }
    };

    this.isReady = isReady;

    // STARTUP

    init();

    window.addEventListener('resize', function(event) {
      console.log('resizing')
      updateSize()
    }, true);
  };

  DepthyViewer.defaultOptions = defaultOptions;

})(window);
