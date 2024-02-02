/*:
* @target MZ
* @plugindesc v1.0.2 This plugin helps you to show text on the screen by using the plugin command. 
* Can be used for questing, notification, etc.
* @author Sang Hendrix & AI
* 
* @param xOffset
* @type number
* @default 0
* @text X Offset
* @desc The X offset for all text.
*
* @param yOffset
* @type number
* @default 0
* @text Y Offset
* @desc The Y offset for all text.
*
* @command ShowText
* @text Show Text
* @desc Show text on the screen
*
* @arg text
* @type multiline_string
* @text Text
* @desc The text to be shown
*
* @arg x
* @type string
* @text X position
* @desc The X position of the text. Default: center
*
* @arg y
* @type string
* @min -9999
* @text Y position
* @desc The Y position of the text.
*
* @arg sfx
* @type file
* @dir audio/se/
* @text SFX
* @desc The SFX to play when the text is shown
*
* @arg sfxVolume
* @type number
* @min 0
* @max 100
* @default 70
* @text SFX Volume
* @desc SFX Volume
*
* @arg sfxPitch
* @type number
* @min 50
* @max 150
* @default 100
* @text SFX Pitch
* @desc SFX Pitch
*
* @arg fontSize
* @type number
* @min 1
* @default 28
* @text Font Size
* @desc Font size
*
* @arg fontFace
* @type text
* @default rmmz-mainfont
* @text Font File name
* @desc Font File name inside fonts folder without extension. Supports: TTF or OTF.
*
* @arg textColor
* @type string
* @default #FFFFFF
* @text Color
* @desc Text color in hex code
*
* @arg outlineEnabled
* @type boolean
* @default true
* @text Show Outline
* @desc Choose whether or not to show outline
*
* @arg outlineColor
* @type string
* @default #000000
* @text Outline Color
* @desc Outline Color
*
* @arg duration
* @type number
* @min 1
* @default 5000
* @text Text Duration
* @desc The time of the text to show in millisecond.
*
* @arg fadeInDuration
* @type number
* @min 1
* @default 1000
* @text Fade in Duration
* @desc The time for the text to fade in in millisecond.
*
* @arg fadeDuration
* @type number
* @min 1
* @default 1000
* @text Fade out Duration
* @desc The time for the text to fade out in millisecond.
*/

(() => {
    const parameters = PluginManager.parameters('ShowTextOnScreen');
    const xOffset = parseInt(parameters['xOffset']);
    const yOffset = parseInt(parameters['yOffset']);

    class ShowTextSprite extends Sprite {
        constructor(text, x, y, fontSize, fontFace, textColor, outlineEnabled, outlineColor, duration, fadeInDuration, fadeDuration, sfx, sfxVolume, sfxPitch) {
            super();
            this.bitmap = new Bitmap(Graphics.width, Graphics.height);
            this._text = text;
            this._x = x;
            this._y = y;
            this._fontSize = fontSize;
            this._fontFace = fontFace;
            this._textColor = textColor;
            this._outlineEnabled = outlineEnabled;
            this._outlineColor = outlineColor;
    
            this.z = 100;
            this.bitmap.fontFace = fontFace;
            this.loadCustomFont(fontFace);
            this.refresh();
            this._sfx = sfx;
            this.opacity = 0;
    
            this.loadCustomFont(fontFace);

            setTimeout(() => {
                const fadeInInterval = setInterval(() => {
                    this.opacity += 255 / (fadeInDuration / (1000 / 60));
                    if (this.opacity >= 255) {
                        clearInterval(fadeInInterval);
                    }
                }, 1000 / 60); 
            }, 0);
    
            setTimeout(() => {
                const fadeOutInterval = setInterval(() => {
                    this.opacity -= 255 / (fadeDuration / (1000 / 60));
                    if (this.opacity <= 0) {
                        clearInterval(fadeOutInterval);
                        SceneManager._scene.removeChild(this);
                    }
                }, 1000 / 60);
            }, duration);
    
            if (this._sfx) {
                const sound = {
                    name: this._sfx,
                    volume: sfxVolume,
                    pitch: sfxPitch,
                    pan: 0
                };
                AudioManager.playSe(sound);
            }
            
        }

        loadCustomFont(fontFileName) {
            if (fontFileName === 'rmmz-mainfont') {
                this.bitmap.fontFace = $dataSystem.advanced.mainFontFilename || 'GameFont';
                this.refresh();
            } else {
                const extensions = ['.ttf', '.otf'];
                let fontLoaded = false;
        
                extensions.forEach(extension => {
                    if (!fontLoaded) {
                        const fontUrl = `fonts/${fontFileName}${extension}`;
                        const fontFace = new FontFace(fontFileName, `url(${fontUrl})`);
                        document.fonts.add(fontFace);
                        fontFace.load().then(() => {
                            if (!fontLoaded) {
                                this.bitmap.fontFace = fontFileName;
                                fontLoaded = true; 
                                this.refresh();
                            }
                        }).catch(() => {
                            console.error(`Failed to load font: ${fontUrl}`);
                        });
                    }
                });
            }
        }
        
        async refresh() {
            this.bitmap.clear();
        
            // Directly using the text from the argument
            let textToDisplay = this._text;
        
            this.bitmap.fontSize = parseInt(this._fontSize);
            this.bitmap.fontFace = this._fontFace;
            this.bitmap.textColor = this._textColor;
        
            if (this._outlineEnabled) {
                this.bitmap.outlineColor = this._outlineColor;
                this.bitmap.outlineWidth = 3;
            } else {
                this.bitmap.outlineWidth = 0;
            }
        
            const width = Graphics.width;
            let baseTextX;
            let y;
        
            if (this._x === 'center') {
                baseTextX = 0;
            } else if (this._x === 'player'){
                baseTextX = $gamePlayer.screenX();
            } else {
                baseTextX = parseInt(this._x) + xOffset;
            }
        
            if (this._y === 'player') {
                y = $gamePlayer.screenY() + yOffset;
            }
            else {
                y = parseInt(this._y) + yOffset;
            }
        
            // Check if convText function exists in PluginManager and use it if available
            let finalText = (typeof PluginManager.convText === 'function') ? PluginManager.convText(textToDisplay) : textToDisplay;
        
            if (this._x === 'center') {
                this.bitmap.drawText(finalText, baseTextX, y, width, Graphics.height, 'center');
            } else if (this._x === 'player'){
                this.bitmap.drawText(finalText, baseTextX, y, width, Graphics.height, 'left');
            }  else {
                this.bitmap.drawText(finalText, baseTextX, y, width, Graphics.height, 'left');
            }
        }
    }

    PluginManager.registerCommand("ShowTextOnScreen", "ShowText", async (args) => {
        const { text, x, y, fontSize, fontFace, textColor, outlineEnabled, outlineColor, duration, fadeInDuration, fadeDuration, sfx, sfxVolume, sfxPitch } = args;
        const newTextSprite = new ShowTextSprite(text, x, parseInt(y), parseInt(fontSize), fontFace, textColor, outlineEnabled === "true", outlineColor, parseInt(duration), parseInt(fadeInDuration), parseInt(fadeDuration), sfx, parseInt(sfxVolume), parseInt(sfxPitch));
        await newTextSprite.refresh();
        SceneManager._scene.addChild(newTextSprite);
    });


})();    
