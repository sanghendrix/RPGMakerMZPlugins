/*:
* @plugindesc Changes the player's graphic depending on the armor he/she is equipping.
* Contact, bug report, feature request: https://sanghendrix.itch.io
* @author Sang Hendrix & ChatGPT
*
* @param Graphic List
* @desc The list of armors and corresponding character graphics. 
* @type struct<ArmorGraphic>[]
*
* @param Enable Switch
* @desc The switch that enables or disables this plugin. If the switch is ON, the plugin is enabled.
* @type switch
*
* @help This plugin changes the player's graphic when they are moving or idle 
* depending on the body armor the player is equipping.
* Note: The armor has to be Body type and the plugin only changes the first 
* actor as this plugin was made for single actor game.
*/

/*~struct~ArmorGraphic:
* 
* @param Armor
* @desc Armor id.
* @type armor
*
* @param Moving Character
* @desc The filename of the character graphic used when the player is moving.
* @type file
* @dir img/characters
*
* @param Idle Character
* @desc The filename of the character graphic used when the player is not moving.
* @type file
* @dir img/characters
*
*/

(function() {
    var parameters = PluginManager.parameters('ChangeArmorGraphics');
    var graphicList = JSON.parse(parameters['Graphic List']).map(JSON.parse);
    var enableSwitch = Number(parameters['Enable Switch']);
  
    var alias_Game_Player_initMembers = Game_Player.prototype.initMembers;
    Game_Player.prototype.initMembers = function() {
        alias_Game_Player_initMembers.call(this);
        this._graphicList = graphicList;
        this._isMoveRouteForcing = false;
        this._isImageChanged = false;
    };
  
    Game_Player.prototype.changeImage = function(characterName, characterIndex) {
        this._isImageChanged = true;
        this.setImage(characterName, characterIndex);
    };
  
    var alias_Game_CharacterBase_setImage = Game_CharacterBase.prototype.setImage;
    Game_CharacterBase.prototype.setImage = function(characterName, characterIndex) {
        var currentPattern = this.pattern();
        if (this._isMoveRouteForcing) {
            this._isImageChanged = true;
        }
        alias_Game_CharacterBase_setImage.call(this, characterName, characterIndex);
        if (!this._isImageChanged) {
            this.setPattern(currentPattern);
        }
    };
  
    var alias_Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;
    Game_Character.prototype.processRouteEnd = function() {
        this._isMoveRouteForcing = false;
        this._isImageChanged = false;
        alias_Game_Character_processRouteEnd.call(this);
    };
  
    var alias_Game_Character_processMoveCommand = Game_Character.prototype.processMoveCommand;
    Game_Character.prototype.processMoveCommand = function(command) {
        this._isMoveRouteForcing = true;
        alias_Game_Character_processMoveCommand.call(this, command);
    };
  
    Game_Player.prototype.getArmorGraphics = function() {
        var equippedArmors = $gameActors.actor(1).equips();
        var bodyArmor = equippedArmors.find(armor => armor && armor.etypeId === 4);
        if (!bodyArmor) {
            return null;
        }
        return this._graphicList.find(graphic => Number(graphic.Armor) === bodyArmor.id);
    };
  
    var alias_Game_Player_update = Game_Player.prototype.update;
    Game_Player.prototype.update = function(sceneActive) {
        alias_Game_Player_update.call(this, sceneActive);
        if ($gameSwitches.value(enableSwitch)) {
            var armorGraphics = this.getArmorGraphics();
            if (armorGraphics) {
                if (!this._isImageChanged && (this.isMoving() || this._isMoveRouteForcing)) {
                    this.setImage(armorGraphics["Moving Character"], 0);
                    this.setStepAnime(false);
                } else if (!this._isImageChanged) {
                    this.setImage(armorGraphics["Default Character"], 0);
                    this.setStepAnime(true);
                }
            }
        }
    };
  
})();
