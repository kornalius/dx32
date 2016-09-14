
export class Block {

  constructor (floppy, entry_idx, size = 0) {
    this.floppy = floppy
    this.drive = this.floppy.drive
    this.entry_idx = entry_idx
    this.idx = this.floppy.blocks.length
    this.mem_top = this.floppy.blocks_table_top + this.floppy.block_size * this.idx * 4
    this.set_size(size)
  }

  set_size (size) {
    if (size > this.floppy.block_size) {
      size = this.floppy.block_size
    }
    if (size < 0) {
      size = 0
    }

    this.mem_size = size
    this.mem_bottom = this.mem_top + this.mem_size - 1
  }

  is_used () { return this.entry_idx !== -1 }

  validPos (pos) { return pos >= this.mem_top && pos <= this.mem_bottom }

  read (addr) {
    this.drive.seek(this.mem_top)
    this.drive.read(addr, this.mem_size)
    return this.mem_size
  }

  write (addr) {
    this.drive.seek(this.mem_top)
    this.drive.write(addr, this.mem_size)
    return this.mem_size
  }

}
