
function rotateX (x, y, ang)
{
    return x * Math.cos(ang) - y * Math.sin(ang);
}

function rotateY (x, y, ang)
{
    return x * Math.sin(ang) + y * Math.cos(ang);
}

class Rendering
{
    constructor()
    {
        this.startX = 150;
        this.startY = 250;
        this.size = 100;
    }

    clear()
    {
        this.ctx.reset();
    }

    render_cube(value, posX, posY)
    {
        this.ctx.beginPath();
        this.ctx.rect(this.startX + posX, this.startY + posY, this.size, this.size);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.fillStyle = "rgb(" + 255 * value / 100 + " 0 " + 255 * (1 - value / 100) + ")";
        this.ctx.fillRect(this.startX + posX + 1 , this.startY + posY + 1 + this.size * (1 - value / 100), (this.size - 2), (this.size - 2) * value / 100);
        this.ctx.stroke();
        this.ctx.strokeStyle = "rgb(0 0 0)";
    }

    render_circle(rotation, posX, color)
    {
        this.ctx.beginPath();
        this.ctx.arc(this.startX + posX, this.startY, this.size, 0, 2 * Math.PI);
        this.ctx.moveTo(this.startX + posX - this.size, this.startY);
        this.ctx.lineTo(this.startX + posX - this.size + this.size / 10, this.startY);

        this.ctx.moveTo(this.startX + posX + this.size, this.startY);
        this.ctx.lineTo(this.startX + posX + this.size - this.size / 10, this.startY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.moveTo(this.startX + posX, this.startY);
        let angle = rotation * (Math.PI/180);
        this.ctx.lineTo(this.startX + posX + rotateX(this.size, 0, angle), this.startY + rotateY(this.size, 0, angle));

        this.ctx.moveTo(this.startX + posX, this.startY);
        angle = (rotation + 180) * (Math.PI/180);
        this.ctx.lineTo(this.startX + posX + rotateX(this.size, 0, angle), this.startY + rotateY(this.size, 0, angle));
        this.ctx.stroke();
        this.ctx.strokeStyle = "rgb(0 0 0)";
    }

    render_pitch(pitch,)
    {
        this.render_circle(pitch, 0, "rgb(255 0 0)");
    }

    render_roll(roll)
    {
        this.render_circle(roll, this.size * 3, "rgb(0 255 0)");
    }

    render_motors(motors_array)
    {
        this.render_cube(motors_array[0], this.size * 5 - this.size / 10, -this.size - this.size / 10);
        this.render_cube(motors_array[1], this.size * 6 + this.size / 10, -this.size - this.size / 10);
        this.render_cube(motors_array[2], this.size * 5 - this.size / 10, this.size / 10);
        this.render_cube(motors_array[3], this.size * 6 + this.size / 10, this.size / 10);
    }

    init() {
        const canvas = document.getElementById("canvas");
        this.ctx = canvas.getContext("2d");
        this.render_pitch(12);
        this.render_roll(-4);
        this.render_motors([10, 30, 60, 90])
    }

}

class LineBreakTransformer {
    constructor() {
        this.buffer = '';
    }

    transform(chunk, controller) {
        this.buffer += chunk;
        const lines = this.buffer.split('\n');

        lines.slice(0, -1).forEach(line => controller.enqueue(line.replace(/\r$/, '')));
        this.buffer = lines[lines.length - 1];
    }

    flush(controller) {
        if (this.buffer) controller.enqueue(this.buffer);
    }
}


const rend = new Rendering();
rend.init();

class SerialScaleController {
    constructor() {
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
    }
    async init() {
        if ('serial' in navigator) {
            try {
                const port = await navigator.serial.requestPort();
                await port.open({ baudRate: 115200 });

                const textDecoder = new TextDecoderStream();
                port.readable.pipeTo(textDecoder.writable);

                const lineStream = textDecoder.readable.pipeThrough(new TransformStream(new LineBreakTransformer()));
                this.reader = lineStream.getReader();

                while(await this.read() == 0)
                {
                    ;
                }
            }
            catch (err) {
                console.error('There was an error opening the serial port:', err);
            }
        }
        else {
            console.error('Web serial doesn\'t seem to be enabled in your browser.');
        }
    }
    async read() {
        var value, done;
        try {
            ({ value, done } = await this.reader.read());
            if (done) 
                return -1;
        }
        catch (err) {
            const errorMessage = `error reading data: ${err}`;
            console.error(errorMessage);
            return -1;
        }
        try {
            
            console.log(value);
            const data = JSON.parse(value);

            const pitch  = data.pitch;       // -2.87
            const roll   = data.roll;        // 8.12
            const motors = data.motors;      // [80, 78, 79, 82]
            rend.clear()
            rend.render_pitch(pitch);
            rend.render_roll(roll);
            rend.render_motors(motors);

        }
        catch (err) {
            console.log(value + ": invalid JSON, skipping this line..." + (err));
        }
        return 0;
    }
}

const serialScaleController = new SerialScaleController();
const connect = document.getElementById('connect-to-serial');

connect.addEventListener('pointerdown', () => {
    serialScaleController.init();
});




