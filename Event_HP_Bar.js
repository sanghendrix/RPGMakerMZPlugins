/*:
 * @plugindesc HP Bar for events with notetag <hp: x>
 * @plugindesc Event_HP_Bar
 * @author YourName
 * 
 * @param barWidth
 * @text Bar Width
 * @type number
 * @desc Width of the HP bar.
 * @default 100
 *
 * @param barHeight
 * @text Bar Height
 * @type number
 * @desc Height of the HP bar.
 * @default 6
 * 
 * @param borderImage
 * @text Border Image
 * @type file
 * @dir img/system/
 * @desc The border image to be used for the HP bar.
 * @default
 * 
 * @param showRadius
 * @text Show Radius
 * @type number
 * @desc The default radius (in tiles) around an event in which the HP bar will be displayed.
 * @default 1
 * 
 * @command refreshEventHpBars
 * @text Refresh Event HP Bars
 * @desc Làm mới HP bars của các sự kiện trên map.
 * 
 * @command ResetEventHpToOriginal
 * @text Reset Event HP To Original
 * @desc Làm mới HP bars của các sự kiện trên map.
 * 
 * @command RemoveEventHpBar
 * @text Remove Event HP Bar
 * @desc Remove the HP bar of the specified event.
 * 
 * @arg eventId
 * @type number
 * @text Event ID
 * @desc The ID of the event to remove the HP bar. -1 to target current event.
 * @min -9999
 *
 * @command UpdateEventHp
 * @text Update Event HP
 * @desc Update the HP of the specified event by the provided value.
 *
 * @arg eventId
 * @type string
 * @text Event ID
 * @desc The ID of the event to update HP. -1 to target current event.
 *
 * @arg value
 * @type number
 * @text HP Change
 * @desc Change in HP (positive number to increase, negative to decrease).
 * @min -9999
 * 
 * @arg hpDecreaseVariableId
 * @type variable
 * @text HP Decrease Variable
 * @desc The variable that contains the amount of HP to decrease.
 *
 * @arg hpIncreaseVariableId
 * @type variable
 * @text HP Increase Variable
 * @desc The variable that contains the amount of HP to increase.
 *
 * @help
 * This plugin will display an HP bar above events that have the notetag <hp: x>,
 * where x is the event's HP value.
 * 
 * Plugin Commands:
 * UpdateEventHp eventId value
 *  eventId: ID of the event to update HP
 *  value: Change in HP (positive number to increase, negative to decrease)
 * 
 * Conditional Script Call: $gameMap.getCurrentEventHp(x) <= 0
 * Change X to this._eventId if want to target the current event.
 * Check the HP value of event ID.
 */

(() => {
	const pluginParams = PluginManager.parameters("Event_HP_Bar");
	const barWidth = parseInt(pluginParams["barWidth"] || 100);
	const barHeight = parseInt(pluginParams["barHeight"] || 6);
	const borderImage = String(pluginParams["borderImage"] || "");
	const defaultRadius = parseInt(pluginParams["showRadius"] || 2);
	const savedEventHp = {};

	const _Game_Map_initialize = Game_Map.prototype.initialize;

	Game_Map.prototype.initialize = function () {
		_Game_Map_initialize.call(this);
		this.initializeRemovedEventHpBars();
	};
	
	Game_Map.prototype.initializeRemovedEventHpBars = function () {
		this._removedEventHpBars = {};
	};

	const _Game_Event_initialize = Game_Event.prototype.initialize;
Game_Event.prototype.initialize = function (mapId, eventId) {
    _Game_Event_initialize.call(this, mapId, eventId);
    this.setInitialHp();
};

Game_Event.prototype.setInitialHp = function () {
    const hpMatch = this.event().note.match(/<hp:\s*(\d+)\s*>/i);
    if (hpMatch) {
        const hpValue = parseInt(hpMatch[1]);
        savedEventHp[this._eventId] = hpValue;
    }
};

	class EventHpBar extends Sprite {
		constructor(event, hp, offsetY, radius) {
			super();
			this._event = event;
			this._maxHp = hp;
			this._currentHp = savedEventHp[event.eventId()] || hp;
			this._offsetY = offsetY || 0;
			this._radius = radius || parseInt(pluginParams["showRadius"]);
			this.bitmap = new Bitmap(barWidth, barHeight);
			this.anchor.set(0.5, 1);
			this._fadingOut = false;
			this._fadeOutFrames = 0;
			this._maxFadeOutFrames = 13;
			this._targetHp = hp;
			this._hpChangeDuration = 13;
			this._hpChangeFrames = 0;
			this.opacity = 0;
			this._fadeInFrames = 0;
			this._maxFadeInFrames = 13;
			this._shouldDisplay = false;
			this._gaugeYOffset = 0;
			this.anchor.set(0.5, 0.5);

			this._borderSprite = new Sprite();
			this.addChild(this._borderSprite);
			this._borderSprite.anchor.set(0.5, 0.5);
			if (borderImage) {
				this._borderSprite.bitmap = ImageManager.loadSystem(borderImage);
			}

			this._flashCounter = 0;
			
			this.refresh();
			this.visible = false; // Ẩn thanh HP khi khởi tạo
			this._removedEventHpBars = new Set();
		}

		update() {
			super.update();
			this.updatePosition();
			this.updateVisibility();
			this.updateZIndex();
			if (this._fadingOut) {
				this.updateFadeOut();
			} else if (this._shouldDisplay && this._fadeInFrames < this._maxFadeInFrames) {
				this.updateFadeIn();
			}
			this.updateHpChange();
			this.updateFlash(); 
		}

		startFadeOut() {
			this._fadingOut = true;
		}

		updateFadeIn() {
			if (this._fadeInFrames < this._maxFadeInFrames) {
				this.opacity = (this._fadeInFrames / this._maxFadeInFrames) * 255;
				this._fadeInFrames++;
			} else {
				this.visible = true;
				this._fadeInFrames = this._maxFadeInFrames;
			}
		}

		updateVisibility() {
			if (!this._event || !$gamePlayer || SceneManager._scene instanceof Scene_Menu) {
				this.visible = false;
				this._shouldDisplay = false;
				return;
			}

			this._borderSprite.opacity = this.opacity;

			const eventX = this._event.x;
			const eventY = this._event.y;
			const playerX = $gamePlayer.x;
			const playerY = $gamePlayer.y;
			const dx = eventX - playerX;
			const dy = eventY - playerY;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance <= this._radius) {
				if (!this.visible && !this._fadingOut) {
					this.visible = true;
					this._fadeInFrames = 0;
				}
				this._shouldDisplay = true;
				this._fadeOutFrames = 0;
			} else {
				if (this.visible && !this._fadingOut) {
					this._shouldDisplay = false;
					this.startFadeOut();
					this._fadeInFrames = 0;
				}
			}
		}

		startFadeOut() {
			this._fadingOut = true;
		}

		updateFadeOut() {
			if (this._fadeOutFrames < this._maxFadeOutFrames) {
				this.opacity = (1 - this._fadeOutFrames / this._maxFadeOutFrames) * 255;
				this._fadeOutFrames++;
			} else {
				this._fadingOut = false;
				this.visible = false;
				this._fadeOutFrames = 0;
			}
		}

		updatePosition() {
			if (!this._event) {
				return;
			}
			const eventScreenPos = this._event.screenX();
			const eventScreenPosY = this._event.screenY();
			const characterName = this._event.characterName();
			const characterIndex = this._event.characterIndex();
			const spriteHeight = this.getEventSpriteHeight(characterName, characterIndex);
			this.x = eventScreenPos;
			this.y = eventScreenPosY - spriteHeight + this._offsetY;
			// Đặt origin Y của hình viền ở giữa và điều chỉnh vị trí của nó
			this._borderSprite.anchor.set(0.5, 0.5);
			this._borderSprite.x = 0
			this._borderSprite.y = 0;
		}


		getEventSpriteHeight(characterName, characterIndex) {
			const bitmap = ImageManager.loadCharacter(characterName);
			const pw = bitmap.width / 12;
			const ph = bitmap.height / 8;
			return ph;
		}

		refresh() {
			const width = this.bitmap.width;
			const rate = this._currentHp / this._maxHp;
			const color1 = "#cf0101";
			const color2 = "#890707";
			const fillColorTop = "#FF6666"; // Màu sáng
			const fillColorBottom = "#990000"; // Màu tối
			const fillW = Math.floor(width * rate);
			const gaugeY = 0;

			this.bitmap.clear();
			this.bitmap.fillRect(0, gaugeY, width, barHeight, "#000000");
			this.bitmap.gradientFillRect(0, gaugeY, fillW, barHeight, color1, color2);
			// Tạo gradient theo chiều dọc
			this.bitmap.gradientFillRect(0, gaugeY, fillW, barHeight / 2, fillColorTop, color1);
			this.bitmap.gradientFillRect(0, gaugeY + barHeight / 2, fillW, barHeight / 2, color2, fillColorBottom);
		}

		setHp(value) {
			this._targetHp = Math.max(0, Math.min(value, this._maxHp));
			this._hpChangeFrames = this._hpChangeDuration;
			savedEventHp[this._event.eventId()] = this._targetHp;
		}

		updateHpChange() {
			if (this._hpChangeFrames > 0) {
				const prevHp = this._currentHp;
				this._currentHp += (this._targetHp - this._currentHp) / this._hpChangeFrames;
		
				if (this._currentHp < prevHp) {
					this._flashFrames = 15;
					this.updateFlash();
				}
		
				this.refresh();
				this._hpChangeFrames--;
			}
		}

		updateFlash() {
			if (this._flashFrames > 0) {
				const color = "white";
				const intensity = 200 * Math.sin((this._flashFrames % 6) * Math.PI / 15);
				this.setBlendColor([255, 255, 255, intensity]);
				this._flashFrames--;
			} else {
				this.setBlendColor([0, 0, 0, 0]);
			}
		}
	}


	class ZIndexManager {
		static updateZIndex(tilemap) {
			tilemap.children.sort((a, b) => {
				if (a.zIndex < b.zIndex) {
					return -1;
				} else if (a.zIndex > b.zIndex) {
					return 1;
				} else {
					return a.y - b.y;
				}
			});
		}
	}
	
	const _Spriteset_Map_update = Spriteset_Map.prototype.update;
	Spriteset_Map.prototype.update = function () {
		_Spriteset_Map_update.call(this);
		ZIndexManager.updateZIndex(this._tilemap);
	};
	
	EventHpBar.prototype.updateZIndex = function () {
		this.zIndex = this._event.screenZ() + 1;
	};
	
	Game_Map.prototype.getCurrentEventHp = function (eventId) {
		const event = this.event(eventId);
		if (!event) return;
		const hpBar = SceneManager._scene._spriteset._eventHpBars.find(hpBar => hpBar._event === event);
		return hpBar ? hpBar._currentHp : null;
	};

	Game_Interpreter.prototype.currentEvent = function () {
		return this.isOnCurrentMap() ? $gameMap.event(this._eventId) : null;
	};

	const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
	Spriteset_Map.prototype.createCharacters = function () {
		_Spriteset_Map_createCharacters.call(this);
		this._eventHpBars = [];

		const mapId = $gameMap.mapId();
    const removedEventHpBars = $gameMap._removedEventHpBars[mapId] || [];
	
		$gameMap.events().forEach((event) => {
			if (!removedEventHpBars.includes(event._eventId)) {
				const hpMatch = event.event().note.match(/<hp:\s*(\d+)\s*>/i);
				const hpYMatch = event.event().note.match(/<hpy:\s*(-?\d+)\s*>/i);
				const radiusMatch = event.event().note.match(/<radius:\s*(\d+)\s*>/i);
				if (hpMatch) {
					const hpValue = parseInt(hpMatch[1]);
					const offsetY = hpYMatch ? parseInt(hpYMatch[1]) : 0;
					const radius = radiusMatch ? parseInt(radiusMatch[1]) : defaultRadius;
					const hpBar = new EventHpBar(event, hpValue, offsetY, radius);
					this._eventHpBars.push(hpBar);
					this._tilemap.addChild(hpBar);
				}
			}
		});
	};


	Game_Interpreter.prototype.updateEventHp = function (eventId, value) {
		const event = eventId === -1 ? this.currentEvent() : $gameMap.event(eventId);
		if (!event) return;
	
		const hpBar = SceneManager._scene._spriteset._eventHpBars.find(hpBar => hpBar._event === event);
		if (hpBar) {
			hpBar.setHp(hpBar._currentHp + value);
		}
	};
	PluginManager.registerCommand("Event_HP_Bar", "UpdateEventHp", function (args) {
		const eventId = parseInt(args.eventId);
		const value = parseInt(args.value);
		const hpDecreaseVariableId = parseInt(args.hpDecreaseVariableId);
		const hpIncreaseVariableId = parseInt(args.hpIncreaseVariableId);
	
		if (hpDecreaseVariableId > 0) {
			const decreaseValue = $gameVariables.value(hpDecreaseVariableId);
			this.updateEventHp(eventId, -decreaseValue);
		} else if (hpIncreaseVariableId > 0) {
			const increaseValue = $gameVariables.value(hpIncreaseVariableId);
			this.updateEventHp(eventId, increaseValue);
		} else {
			this.updateEventHp(eventId, value);
		}
	});

	Game_Interpreter.prototype.removeEventHpBar = function (eventId) {
		const event = eventId === -1 ? this.currentEvent() : $gameMap.event(eventId);
		if (!event) return;
	
		const spriteset = SceneManager._scene._spriteset;
		const hpBarIndex = spriteset._eventHpBars.findIndex(hpBar => hpBar._event === event);
	
		if (hpBarIndex > -1) {
			const hpBar = spriteset._eventHpBars[hpBarIndex];
			hpBar.startFadeOut();

			const mapId = $gameMap.mapId();
        if (!Array.isArray($gameMap._removedEventHpBars[mapId])) {
            $gameMap._removedEventHpBars[mapId] = [];
        }
        $gameMap._removedEventHpBars[mapId].push(event._eventId);
	
			setTimeout(() => {
				spriteset._tilemap.removeChild(hpBar);
				spriteset._eventHpBars.splice(hpBarIndex, 1);
			}, hpBar._maxFadeOutFrames * 1000 / 60);
		}
	};

	PluginManager.registerCommand("Event_HP_Bar", "RemoveEventHpBar", function (args) {
		const eventId = parseInt(args.eventId);
		this.removeEventHpBar(eventId);
	});

	Game_Map.prototype.getCharacterDistance = function (character1, character2) {
		const dx = Math.abs(character1.x - character2.x);
		const dy = Math.abs(character1.y - character2.y);
		return Math.sqrt(dx * dx + dy * dy);
	};


	Spriteset_Map.prototype.refreshEventHpBars = function () {
		const mapId = $gameMap.mapId();
		const removedEventHpBars = $gameMap._removedEventHpBars[mapId] || [];
	
		$gameMap.events().forEach((event) => {
			const existingHpBar = this._eventHpBars.find((hpBar) => hpBar._event === event);
			if (existingHpBar) return;
	
			if (!removedEventHpBars.includes(event._eventId)) {
				const hpMatch = event.event().note.match(/<hp:\s*(\d+)\s*>/i);
				const hpYMatch = event.event().note.match(/<hpy:\s*(-?\d+)\s*>/i);
				const radiusMatch = event.event().note.match(/<radius:\s*(\d+)\s*>/i);
				if (hpMatch) {
					const hpValue = parseInt(hpMatch[1]);
					const offsetY = hpYMatch ? parseInt(hpYMatch[1]) : 0;
					const radius = radiusMatch ? parseInt(radiusMatch[1]) : defaultRadius;
					const hpBar = new EventHpBar(event, hpValue, offsetY, radius);
					this._eventHpBars.push(hpBar);
					this._tilemap.addChild(hpBar);
				}
			}
		});
	};

	PluginManager.registerCommand('Event_HP_Bar', 'refreshEventHpBars', () => {
        if (SceneManager._scene instanceof Scene_Map) {
            SceneManager._scene._spriteset.refreshEventHpBars();
        }
    });

	Game_Event.prototype.resetHpToOriginal = function () {
		const hp = this.event().meta.hp;
		if (hp !== undefined) {
			this._hp = parseInt(hp);
		}
	};

PluginManager.registerCommand('Event_HP_Bar', "ResetEventHpToOriginal", function (args) {
    $gameMap.events().forEach(event => {
        event.resetHpToOriginal();
    });
});


})();
