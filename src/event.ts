class MapEvent {
  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.addEventListener('mousedown', this.mousedown);
    this.canvas.addEventListener('mousemove', this.mousemove);
    this.canvas.addEventListener('mouseup', this.mouseup);
  }

  mousemove = (e: MouseEvent) => {
    console.log('move');
  }

  mousedown = (e: MouseEvent) => {
    console.log('down');
  }

  mouseup = (e: MouseEvent) => {
    console.log('up');
  }

  on(eventName: string, cb: any) {
    if (eventName === 'mousemove') {
      this.canvas.addEventListener(eventName, cb);
    }
  }

  off(eventName: string, cb: any) {
    if (eventName === 'mousemove') {
      this.canvas.removeEventListener(eventName, cb);
    }
  }
}

export default MapEvent;
