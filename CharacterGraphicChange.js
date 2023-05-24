/*:
 * @plugindesc Thay đổi graphic của nhân vật khi người chơi giữ các nút di chuyển và bật stepping animation khi idle
 * @author Bạn
 *
 * @param ArmorGraphics
 * @text Danh sách Armor và Graphic
 * @desc Danh sách các armor và graphic tương ứng cho trạng thái di chuyển và idle
 * @type struct<ArmorGraphic>[]
 * @default []
 *
 * @param EnableSwitch
 * @text Switch kích hoạt
 * @desc Switch dùng để kích hoạt hoặc tắt plugin
 * @type switch
 * @default 1
 * 
 * @command Activate
 * @text Kích hoạt
 * @desc Kích hoạt lại toàn bộ tính năng của plugin
 *
 * @help
 * Sau khi cài đặt plugin, bạn chỉ cần thiết lập các thông số trong ArmorGraphics, bao gồm Armor ID,
 * Graphic khi di chuyển và Graphic khi không di chuyển. Plugin sẽ tự động thay đổi graphic của nhân vật
 * dựa trên việc nhân vật có mặc armor được chỉ định trong danh sách hay không.
 */

/*~struct~ArmorGraphic:
 * @param ArmorID
 * @text Armor ID
 * @desc ID của armor trong danh sách
 * @type armor
 * @default 1
 *
 * @param MovingGraphic
 * @text Graphic khi di chuyển
 * @desc Tên file graphic khi nhân vật đang di chuyển và mặc armor tương ứng
 * @type file
 * @dir img/characters
 * @require 1
 *
 * @param IdleGraphic
 * @text Graphic khi không di chuyển
 * @desc Tên file graphic khi nhân vật không di chuyển và mặc armor tương ứng
 * @type file
 * @dir img/characters
 * @require 1
 */

(() => {
    const pluginName = "CharacterGraphicChange";
    const parameters = PluginManager.parameters(pluginName);
    const armorGraphics = JSON.parse(parameters["ArmorGraphics"]).map(
      (item) => JSON.parse(item)
    );
    const enableSwitch = parseInt(parameters["EnableSwitch"]);

    PluginManager.registerCommand(pluginName, "Activate", args => {
        // Kích hoạt switch
        $gameSwitches.setValue(enableSwitch, true);

        // Đánh dấu cần cập nhật graphic của nhân vật
        $gamePlayer._needsGraphicUpdate = true;
    });
  
    const _Game_Player_update = Game_Player.prototype.update;
    Game_Player.prototype.update = function (sceneActive) {
        const wasMoving = this.isMoving();
        _Game_Player_update.call(this, sceneActive);
        const isMoving = this.isMoving();

        if (wasMoving !== isMoving && !this._moveRouteForcing) {
            // Đánh dấu cần cập nhật graphic của nhân vật
            this._needsGraphicUpdate = true;
        }
    };
  
    // Cập nhật graphic của nhân vật ở cuối frame
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if ($gamePlayer._needsGraphicUpdate && !$gamePlayer._moveRouteForcing) {
            $gamePlayer.updateCharacterGraphic();
            $gamePlayer._needsGraphicUpdate = false;
        }
    };
  
	Game_Player.prototype.updateCharacterGraphic = function () {
	  if (!$gameSwitches.value(enableSwitch)) return;
	  if ($gameMap.isEventRunning()) return;
	  const isMoving = this.isMoving();
	  const characterName = this.characterName();
	  const actor = $gameActors.actor(1);
	  const currentArmor = actor.equips().find((equip) => {
		return equip && equip.etypeId === 4; // 4 is the etypeId for Body Armor
	  });
  
	  if (currentArmor) {
		const matchingArmorGraphic = armorGraphics.find(
		  (armorGraphic) => parseInt(armorGraphic.ArmorID) === currentArmor.id
		);
  
		if (matchingArmorGraphic) {
		  const targetGraphic = isMoving
			? matchingArmorGraphic.MovingGraphic
			: matchingArmorGraphic.IdleGraphic;
  
		  if (characterName !== targetGraphic) {
			this.setImage(targetGraphic, this.characterIndex());
			this.setStepAnime(!isMoving); // Enable stepping animation when idle
			this.setWalkAnime(isMoving); // Enable walking animation when moving
		  }
		}
	  }
	};
  
	const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
	Game_Actor.prototype.changeEquip = function (slotId, item) {
	  _Game_Actor_changeEquip.call(this, slotId, item);
	  if (this.actorId() === 1) {
		$gamePlayer.updateCharacterGraphic();
	  }
	};
  
	const _Game_Character_processRouteEnd = Game_Character.prototype.processRouteEnd;
	Game_Character.prototype.processRouteEnd = function () {
	  _Game_Character_processRouteEnd.call(this);
	  if (this instanceof Game_Player) {
		this.updateCharacterGraphic();
	  }
	};
  
	const _Game_Switches_setValue = Game_Switches.prototype.setValue;
	Game_Switches.prototype.setValue = function (switchId, value) {
	  _Game_Switches_setValue.call(this, switchId, value);
	  if (switchId === enableSwitch && value && $gamePlayer) {
		$gamePlayer.updateCharacterGraphic();
	  }
	};
  })();
  