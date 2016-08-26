import { Entry, _ENTRY_OPEN, _ENTRY_LOCK } from './entry.js'
import { io_error } from '../../globals.js'


export const _DOS_PATHSEP = '/'
export const _DOS_EXTSEP = '.'
export const _DOS_CURRENT = '.'
export const _DOS_PARENT = '..'

export class DOS {

  constructor (drive) {
    this.drive = drive
    this.current = null
    this.drive_path = '#' + _vm.port_name(this.drive.port_number)
  }

  path_split (path) { return path.split(_DOS_PATHSEP) }

  path_join (paths) { return paths.join(_DOS_PATHSEP) }

  normalize (path) {
    let cwd = this.cwd()
    let newparts = []
    let paths = this.path_split(path)
    let i = 0
    let len = paths.length
    let p = paths[i]
    while (i < len) {
      if (p === _DOS_CURRENT) {
        newparts = newparts.concat(cwd)
      }
      else if (p === _DOS_PARENT) {
        newparts = newparts.concat(cwd.slice(0, cwd.length - 1))
      }
      else {
        newparts.push(p)
      }
      i++
      p = paths[i]
    }
    return newparts
  }

  pathname (paths) { return this.path_join(paths) }

  dirname (path) {
    let parts = this.normalize(path)
    if (_.last(parts).indexOf(_DOS_EXTSEP)) {
      parts.pop()
    }
    return this.path_join(parts)
  }

  basename (path) { return _.first(this.filename(path).split(_DOS_EXTSEP)) }

  extname (path) { return _.last(this.filename(path).split(_DOS_EXTSEP)) }

  filename (path) { return _.last(this.normalize(path)) }

  eject () {
    this.current = null
  }

  insert (floppy) {
    this.current = new Entry(floppy)
  }

  format () {
    if (this.drive.loaded()) {
      this.drive.floppy.format()
    }
  }

  cd (path) { this.current = this.drive.floppy.find_entry(this.drive.floppy.join(this.drive.floppy.normalize(path))) }

  cwd () { return this.pathname(this.current.paths()) }

  exists (path) { return this.drive.floppy.find_entry(path) !== null }

  size (id) {
    let sz = 0
    let entry = this.drive.floppy.find_entry(id)
    if (entry) {
      let blocks = entry.blocks()
      for (let b of blocks) {
        sz += b.size
      }
      this.drive.operation('read', blocks.length * 4)
    }
    return sz
  }

  flush () {
    if (this.drive.loaded()) {
      this.drive.floppy.flush()
    }
  }

  create (path, data = null, size = 0, attrs = 0, created = Date.now(), modified = Date.now()) {
    let parent = this.drive.floppy.find_entry(this.dirname(path))
    if (data && size === 0) {
      size = data.length
    }
    let entry = new Entry(this.drive.floppy, this.drive.floppy.entries.length, 0, parent ? parent._uid : 0, this.basename(path), this.extname(path), created, modified, attrs)
    this.drive.floppy.entries.push(entry)
    entry.write(data, size)
    this.flush()
  }

  fopen (path) {
    let entry = this.find_entry(path)
    if (entry) {
      if (!entry._isOpened()) {
        entry.attrs |= _ENTRY_OPEN
        this.flush()
      }
      else {
        io_error(0x02)
      }
    }
  }

  fread (id, size, addr) {
    let entry = this.find_entry(id)
    if (entry) {
      this.read(addr, size)
    }
  }

  fwrite (id, addr, size) {
    let entry = this.find_entry(id)
    if (entry) {
      this.write(addr, size)
    }
  }

  append (id, addr, size) {
    let entry = this.find_entry(id)
    if (entry) {
      // this.seek(size())
    }
  }

  fclose (id) {
    let entry = this.find_entry(id)
    if (entry) {
      if (entry._isOpened()) {
        entry.attrs ^= _ENTRY_OPEN
        this.flush()
      }
      else {
        io_error(0x03)
      }
    }
  }

  delete (path) {
    let entry = this.find_entry(path)
    if (entry) {
      if (!entry._isLocked()) {
        entry.uid = 0
        entry.parent_uid = 0
        entry.parent = null
        this.flush()
      }
      else {
        io_error(entry, 0x09)
      }
    }
  }

  lock (path) {
    let entry = this.find_entry(path)
    if (entry) {
      if (!entry._isLocked()) {
        entry.attrs |= _ENTRY_LOCK
        this.flush()
      }
      else {
        io_error(entry, 0x04)
      }
    }
  }

  unlock (path) {
    let entry = this.find_entry(path)
    if (entry) {
      if (!entry._isLocked()) {
        entry.attrs ^= _ENTRY_LOCK
        this.flush()
      }
      else {
        io_error(entry, 0x05)
      }
    }
  }

}
