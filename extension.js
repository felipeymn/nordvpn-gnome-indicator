const { St, GLib, Clutter } = imports.gi
const GObject = imports.gi.GObject
const Gio = imports.gi.Gio
const Mainloop = imports.mainloop
const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()
const ByteArray = imports.byteArray

const CMD = {
  FETCH_STATUS: `/bin/bash -c "nordvpn status | grep -q 'Connected' && echo -n 'Connected' || echo -n 'Disconnected'"`,
  CONNECT_BR: `/bin/bash -c "nordvpn connect brazil"`,
  DISCONNECT: `/bin/bash -c "nordvpn disconnect"`,
}
Object.freeze(CMD)

const STATUS = {
  STARTING: 'Starting...',
  CONNECTED: 'Connected',
  DISCONNECTED: 'Disconnected',
}
Object.freeze(STATUS)

// const NordMenu = GObject.registerClass(
//   class NordMenu extends PopupMenu.PopupMenuItem {
//     _init() {
//       super._init('Test1')
//       this._label = new St.Label({
//         text: 'Label',
//       })
//       this.add_child(this._label)
//       this.connect('activate', () => {
//         log('clicked')
//       })
//     }
//   }
// )

const ConnectionSwitch = GObject.registerClass(
  class ConnectionSwitch extends PopupMenu.PopupSwitchMenuItem {
    _init(state) {
      super._init('Connect', state)
      this.connect('toggled', () => {
        this._switch.state
          ? GLib.spawn_command_line_async(CMD.CONNECT_BR)
          : GLib.spawn_command_line_async(CMD.DISCONNECT)
      })
    }
  }
)

const NordIndicator = GObject.registerClass(
  class NordIndicator extends PanelMenu.Button {
    _init() {
      super._init(0)
      this.style_class = 'indicator-disconnected'
      this._label = new St.Label({
        text: STATUS.STARTING,
        y_align: Clutter.ActorAlign.CENTER,
      })
      this._icon = new St.Icon({
        // style_class: 'system-status-icon',
        style_class: 'nord-icon',
        gicon: Gio.icon_new_for_string(Me.dir.get_path() + '/nordvpn.svg'),
        // icon_name: 'security-low-symbolic',
      })
      // this.add_child(this._label)
      this.add_child(this._icon)
      this._updateOnStatusChange()
      this._statusObserver = Mainloop.timeout_add_seconds(
        2.0,
        this._updateOnStatusChange.bind(this)
      )
      this._connectionSwitch = new ConnectionSwitch(
        STATUS.CONNECTED === this._status
      )
      // this.menu.addMenuItem(new NordMenu())
      this.menu.addMenuItem(this._connectionSwitch)
    }

    _fetchConnectionStatus() {
      var [ok, stdout, stderr, exit_status] = GLib.spawn_command_line_sync(
        CMD.FETCH_STATUS
      )
      return ByteArray.toString(stdout)
    }

    _updateOnStatusChange() {
      this.setStatus(this._fetchConnectionStatus())
      this.style_class = `indicator-${this._status.toLowerCase()}`
      this.setLabelText(this._status)
      return true
    }

    removeStatusObserver() {
      if (this._statusObserver) {
        Mainloop.source_remove(this._statusObserver)
        this._statusObserver = null
      }
    }

    setStatus(status) {
      this._status = status
    }

    setLabelText(text) {
      this._label.set_text(text)
    }
  }
)

var nordIndicator

function init() {}

function enable() {
  nordIndicator = new NordIndicator()
  Main.panel.addToStatusArea(`${Me.metadata.name} Indicator`, nordIndicator)
}

function disable() {
  nordIndicator.removeStatusObserver()
  nordIndicator.destroy()
}
