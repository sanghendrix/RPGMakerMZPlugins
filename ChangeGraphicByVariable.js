/*:
 * @plugindesc [Ver 1.0] Change character graphic using a variable
 *
 * @author Sang Hendrix & ChatGPT
 *
 * @help
 * This plugin allows you to change a character's graphic using a variable that contains 
 * the image file path. It also helps you change pattern of a graphic file.
 *
 * To set a graphic file name to a variable, simply create a variable with a script with
 * your file name in folder img/characters. For example:
 * 
 * If your file name is LOL.png in folder img/characters, write: "LOL".
 * If you file name is LOL.png in sub-folder AHA in folder img/characters, write: "AHA/LOL".
 * 
 * Note: Quotation Mark included.
 * 
 * To change an event graphic said variable in Movement Route, use this script:
 * 
 * changeCharacterGraphicByVariable(variableId);
 * 
 * To change graphic pattern, call this script in Movement Route:
 * 
 * changeCharacterPattern(pattern);
 * 
 * In a solo character graphic file, Pattern is basically like this (0, 1, 2):
 * 0 1 2
 * 0 1 2
 * 0 1 2
 * 0 1 2
 * With that, you can store up to 12 sprites in a single image!
 * 
 * To stop the game from automatically reset the pattern to default and causing glitches,
 * use this script call: 
 * 
 * togglePatternReset(true or false)
 * True to stop the reset, False to set everything to default.
 * 
 * THE BEST ORDER CHANGE GRAPHIC PATTERN IN MOVEMENT ROUTE:
 * 1. togglePatternReset(true);
 * 2. changeCharacterPattern(0);
 * 3. Change your graphic file
 * 4. Turn left right down or whatever
 * 5. changeCharacterPattern(1);
 * 6. Continue turning
 * 7. Change your graphic file back to the original one if needed
 * 8. togglePatternReset(false);
 */

function changeCharacterGraphicByVariable(variableId) {
    const imagePath = $gameVariables.value(variableId);
    const character = $gamePlayer;
    const match = imagePath.match(/^(.+?)(?:_([0-9]+))?$/);
    const filename = match[1];
    const index = Number(match[2]) || 0;
    const direction = character.direction();
    character.setImage(filename, index);
    character.setDirection(direction);
}

function changeCharacterPattern(pattern) {
    const character = $gamePlayer;
    character._originalPattern = pattern;
    character._pattern = pattern;
}

Game_CharacterBase.prototype.updatePattern = function() {
    if (!this._disablePatternReset) {
        if (!this.hasStepAnime() && this._stopCount > 0) {
            this.resetPattern();
        } else {
            this._pattern = (this._pattern + 1) % this.maxPattern();
        }
    }
};

function togglePatternReset(disable) {
    const character = $gamePlayer;
    character._disablePatternReset = disable;
}