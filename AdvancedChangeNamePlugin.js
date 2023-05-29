/*:
* @target MZ
* @plugindesc 1.0.2 Automatically replace the words you wrote from item description, messages, and choices to the words that you input into this plugin.
* @author Sang Hendrix & Chat GPT
* @url www.intosamomor.com
* @version 1.0.2
*
* @param replacements
* @text Words to be replaced
* @desc List of words to be replaced and words to replace
* @type struct<Replacement>[]
* @default []
*
* @param enableSwitch
* @text Activation Switch
* @desc Turn this switch ON to enable the plugin and opposite.
* @type switch
* @default 0
*/

/*~struct~Replacement:
*
* @param word_to_replace
* @text From
* @desc The words need to be replaced
* @type string
* @default
*
* @param replacement_word
* @text To
* @desc The words to replace
* @type string
* @default
*/

(() => {
  "use strict";

  const pluginName = "AdvancedChangeNamePlugin";
  const parameters = PluginManager.parameters(pluginName);
  const replacements = JSON.parse(parameters["replacements"]);
  const enableSwitch = parseInt(parameters["enableSwitch"]);

  // Save the original functions for later use
  const _Window_Message_convertEscapeCharacters =
    Window_Message.prototype.convertEscapeCharacters;
  const _Window_Base_convertEscapeCharacters =
    Window_Base.prototype.convertEscapeCharacters;
  const _Game_Interpreter_setupChoices = Game_Interpreter.prototype.setupChoices;

  Window_Message.prototype.convertEscapeCharacters = function (text) {
    // Check the status of the activation switch
    if (!enableSwitch || $gameSwitches.value(enableSwitch)) {
      text = replaceWords(text);
    }

    // Call the original function to process other escape characters
    return _Window_Message_convertEscapeCharacters.call(this, text);
  };

  Window_Base.prototype.convertEscapeCharacters = function (text) {
    // Check the status of the activation switch
    if (!enableSwitch || $gameSwitches.value(enableSwitch)) {
      text = replaceWords(text);
    }

    // Call the original function to process other escape characters
    return _Window_Base_convertEscapeCharacters.call(this, text);
  };

  Game_Interpreter.prototype.setupChoices = function (params) {
    if (!enableSwitch || $gameSwitches.value(enableSwitch)) {
      const newChoices = params[0].map(choice => {
        // Check if DK Localization plugin is loaded
        if (PluginManager._scripts.includes("DKTools_Localization")) {
          // Get the localized text from DK_Localization
          const localizedText = DKTools.Localization.getText(choice);
          return replaceWords(localizedText);
        } else {
          // If DK Localization is not loaded, just replace words in the original text
          return replaceWords(choice);
        }
      });
      params[0] = newChoices;
    }
    _Game_Interpreter_setupChoices.call(this, params);
  };
  
  
  

  function replaceWords(text) {
    replacements.forEach((replacement) => {
      const wordToReplace = JSON.parse(replacement).word_to_replace;
      const replacementWord = JSON.parse(replacement).replacement_word;

      // Replace the word to be replaced with the corresponding replacement word
      const regex = new RegExp(wordToReplace, "g");
      text = text.replace(regex, replacementWord);
    });

    return text;
  }
})();
