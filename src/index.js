import domready from "domready"
import "./style.css"
import { createHexagon, deleteAllHexagons, hexagonScale } from "./area";
import centroid from "./util";
import { Edge, Face, HalfEdge, Vertex } from "./geometry";
import colors from "./colors";
import Color, { getLuminance } from "./Color";
import weightedRandom from "./weightedRandom";


const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;
const DEG2RAD_FACTOR = TAU / 360;

const config = {
    width: 0,
    height: 0
};

/**
 * @type CanvasRenderingContext2D
 */
let ctx;
let canvas;


function drawArrow(x0, y0, x1, y1)
{
    const { width, height} = config;

    const cx = width/2;
    const cy = height/2;

    const dy = y1 - y0;
    const dx = x1 - x0;



    const nx = dy * 0.08
    const ny = -dx * 0.08

    const start = 0.01
    const end = 0.5

    const x2 = x0 + (x1 - x0) * start
    const y2 = y0 + (y1 - y0) * start
    const x3 = x0 + (x1 - x0) * end
    const y3 = y0 + (y1 - y0) * end

    const x4 = x0 + (x1 - x0) * (start + (end - start) * 0.6)
    const y4 = y0 + (y1 - y0) * (start + (end - start) * 0.6)

    ctx.strokeStyle = "#0f0"
    ctx.beginPath()
    ctx.moveTo(cx + x2, cy + y2)
    ctx.lineTo(cx + x3, cy + y3)

    ctx.moveTo(cx + x3, cy + y3)
    ctx.lineTo(cx + x4 + nx, cy + y4 + ny)
    ctx.moveTo(cx + x3, cy + y3)
    ctx.lineTo(cx + x4 - nx, cy + y4 - ny)
    ctx.stroke()

    if (dx * dx + dy * dy < 1)
    {
        ctx.fillStyle = "#f0f"
        ctx.fillRect(0|(cx + x0-1),0|(cy + y0-1),2,2)
    }
}


function renderDebugFace(face, drawNext = false, ids = false)
{
    const { width, height} = config;

    const cx = width/2;
    const cy = height/2;

    const faceCentroid = centroid(face)

    if (ids)
    {
        ctx.fillText(String(face.id), cx+ faceCentroid[0], cy+ faceCentroid[1])
    }
    else
    {
        ctx.fillRect(cx + faceCentroid[0] - 1, cy + faceCentroid[1] - 1, 2, 2)
    }

    const first = face.halfEdge;
    let curr = first;
    do
    {
        const next = curr.next;


        const x0 = 0|(cx + curr.vertex.x)
        const y0 = 0|(cy + curr.vertex.y)
        const x1 = 0|(cx + next.vertex.x)
        const y1 = 0|(cy + next.vertex.y)
        ctx.strokeStyle = "rgba(255,255,255,0.3)"
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.stroke()


        //ctx.fillRect(x0 - 2,y0 - 2,4,4)

        const x2 = 0|((x0 + x1)/2 - cx)
        const y2 = 0|((y0 + y1)/2 - cy)

        if (drawNext)
        {
            const { twin }  = curr;
            if (twin)
            {
                const twinCentroid = centroid(twin.face)

                const [ x0, y0 ] = faceCentroid;
                const [ x1, y1 ] = twinCentroid;

                drawArrow(x2, y2, x0, y0);
                //drawArrow(x2, y2, x1, y1);

            }

        }

        curr = next
    }  while (curr !== first)

}


function findInsideEdges(faces)
{
    const edges = new Set()

    for (let i = 0; i < faces.length; i++)
    {
        const face = faces[i];

        const first = face.halfEdge;
        let curr = first;
        do
        {
            if (curr.twin)
            {
                edges.add(curr.edge)
            }

            curr = curr.next

        } while (curr !== first)
    }

    return edges;
}

function getEdges(faces)
{
    const edges = new Set()

    for (let i = 0; i < faces.length; i++)
    {
        const face = faces[i];

        const first = face.halfEdge;
        let curr = first;
        do
        {
            if (!curr.edge)
            {
                throw new Error("No edge set")
            }

            if (curr.twin)
            {

            }

            edges.add(curr.twin ? (curr.twin.id < curr.id ? curr.twin : curr) : (curr))
            curr = curr.next

        } while (curr !== first)
    }

    return edges;
}


function shuffle(a) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}



function findFace(faces, other)
{
    if (!other)
    {
        throw new Error("Need face")
    }

    for (let i = 0; i < faces.length; i++)
    {
        const face = faces[i];
        if (face === other)
        {
            return i
        }
    }
    return -1;
}
//     removeEdge(faces, edge)
export const it = (v, fn) => {

    const set = new Set();

    const arr = [];
    let curr = v;
    do
    {
        if (set.has(curr))
        {
            throw new Error("Duplicate on iteration: " + curr)
        }

        set.add(curr)
        arr.push(fn(curr));
        curr = curr.next
    } while (curr !== v);
    return arr
}

function removeEdge(faces, edge)
{
    if (!edge || !edge.halfEdge || !edge.halfEdge.twin)
    {
        throw new Error("Need half edge and twin")
    }

    const he = edge.halfEdge;
    const face = he.face
    const other = he.twin.face
    if (face.length !== 3 || other.length !== 3)
    {
        return;
    }

    const index = findFace(faces, other)
    if (index < 0)
    {
        throw new Error("Did not find twin face in faces array")
    }
    faces.splice(index, 1)



    const prev = he.prev
    const twinPrev = he.twin.prev

    prev.next = he.twin.next
    twinPrev.next = he.next


    it(prev, he => he.face = face)
    // let curr = prev;
    // do
    // {
    //     curr.face = face
    //     curr = curr.next
    // } while (curr !== prev)

    if (face.halfEdge === he)
    {
        face.halfEdge = prev
    }
}


function subdivideEdge(he)
{
    const { twin } = he

    const vertex = new Vertex(
        (he.vertex.x + he.next.vertex.x) / 2,
        (he.vertex.y + he.next.vertex.y) / 2,
        (he.vertex.z + he.next.vertex.z) / 2,
        null
    )

    const edge = new Edge(null)
    const newEdge = new HalfEdge(he.next, vertex, edge, he.face);
    he.next = newEdge
    if (twin)
    {
        twin.next = new HalfEdge(twin.next, vertex, edge, he.face)

        he.twinWith(twin.next)
        twin.twinWith(newEdge)
    }

    return newEdge
}


function divideTriIntoQuads(faces, face)
{
    let ha = face.halfEdge
    let hab = face.halfEdge.next
    let hb = face.halfEdge.next.next
    let hbc = face.halfEdge.next.next.next
    let hc = face.halfEdge.next.next.next.next
    let hca = face.halfEdge.next.next.next.next.next


    const vertex = new Vertex(
        (ha.vertex.x + hb.vertex.x + hc.vertex.x) / 3,
        (ha.vertex.y + hb.vertex.y + hc.vertex.y) / 3,
        (ha.vertex.z + hb.vertex.z + hc.vertex.z) / 3,
        null
    )

    const fa = new Face(null);
    const fb = new Face(null);
    const fc = new Face(null);


    const hvca = new HalfEdge(hca, vertex, new Edge(null), fa);
    const hvab = new HalfEdge(hab, vertex, new Edge(null), fb);
    const hvbc = new HalfEdge(hbc, vertex, new Edge(null), fc);

    const habv = new HalfEdge(hvca, hab.vertex, hvca.edge, fa);
    const hbcv = new HalfEdge(hvab, hbc.vertex, hvab.edge, fb);
    const hcav = new HalfEdge(hvbc, hca.vertex, hvbc.edge, fc);

    hvab.twinWith(habv)
    hvbc.twinWith(hbcv)
    hvca.twinWith(hcav)

    hca.face = fa
    hab.face = fb
    hbc.face = fc

    ha.next = habv;
    hb.next = hbcv;
    hc.next = hcav;
    
    faces.push(fa,fb,fc)

}


function subdivideQuad(faces, face)
{

    let ha = face.halfEdge
    let hab = ha.next
    let hb = hab.next
    let hbc = hb.next
    let hc = hbc.next
    let hcd = hc.next
    let hd = hcd.next
    let hda = hd.next


    const vertex = new Vertex(
        (ha.vertex.x + hb.vertex.x + hc.vertex.x + hd.vertex.x) / 4,
        (ha.vertex.y + hb.vertex.y + hc.vertex.y + hd.vertex.y) / 4,
        (ha.vertex.z + hb.vertex.z + hc.vertex.z + hd.vertex.z) / 4,
        null
    )

    const fa = new Face(null);
    const fb = new Face(null);
    const fc = new Face(null);
    const fd = new Face(null);


    const hvab = new HalfEdge(hab, vertex, new Edge(null), fb);
    const hvbc = new HalfEdge(hbc, vertex, new Edge(null), fc);
    const hvcd = new HalfEdge(hcd, vertex, new Edge(null), fd);
    const hvda = new HalfEdge(hda, vertex, new Edge(null), fa);

    const habv = new HalfEdge(hvda, hab.vertex, hvcd.edge, fa);
    const hbcv = new HalfEdge(hvab, hbc.vertex, hvab.edge, fb);
    const hcdv = new HalfEdge(hvbc, hcd.vertex, hvbc.edge, fc);
    const hdav = new HalfEdge(hvcd, hda.vertex, hvda.edge, fd);

    hvab.twinWith(habv)
    hvbc.twinWith(hbcv)
    hvcd.twinWith(hcdv)
    hvda.twinWith(hdav)

    ha.next = habv;
    hb.next = hbcv;
    hc.next = hcdv;
    hd.next = hdav;

    faces.push(fa,fb,fc,fd)


}



function divideIntoQuads(faces)
{

    getEdges(faces).forEach(e => subdivideEdge(e))

    const newFaces = [];

    for (let i = 0; i < faces.length; i++)
    {
        const face = faces[i];

        const { length } = face;

        if ( length === 6 )
        {
            divideTriIntoQuads(newFaces, face)
        }
        else if ( length === 8 )
        {
            if (Math.random() < 0.5)
            {
                subdivideQuad(newFaces, face)
            }
            else
            {
                newFaces.push(face)
            }

        }
        else
        {
            throw new Error("Not tri or quad")
        }
    }

    return newFaces
}



function validateFace(face)
{
    const { halfEdge } = face
    if (!halfEdge)
    {
        throw new Error("No half edge: " + face)
    }
    const set = new Set();

    let curr = halfEdge;
    do
    {
        if (set.has(curr))
        {
            throw new Error("Duplicate on iteration: " + curr)
        }

        set.add(curr)

        const next = curr.next;
        if (!next)
        {
            throw new Error("Next not set: " + face)
        }
        curr = next
    } while (curr !== halfEdge)

}


function setToAverage(v)
{
    const { halfEdge : start } = v;

    if (!start)
    {
        return;
    }

    let x = 0;
    let y = 0;
    let z = 0;
    let count = 0;

    let curr = start;
    let twin
    let max = 20;
    do
    {
        x += curr.next.vertex.x
        y += curr.next.vertex.y
        z += curr.next.vertex.z
        count++

        twin = curr.twin;
        if (twin)
        {
            curr = twin.next
        }
        
    } while(twin && curr !== start && max-- > 0)


    // if (!twin)
    // {
    //     const prev = start.prev;
    //     let curr = prev;
    //     max = 10
    //     do
    //     {
    //         x += curr.next.vertex.x
    //         y += curr.next.vertex.y
    //         count++
    //
    //         twin = curr.twin;
    //         if (twin)
    //         {
    //             curr = twin.prev
    //         }
    //
    //     } while(twin && curr !== prev && max-- > 0)
    // }

    if (twin)
    {
        v.x = x/count
        v.y = y/count
        v.z = z/count

    }
}


function relax(faces)
{
    const set = new Set()
    for (let i = 0; i < faces.length; i++)
    {
        const face = faces[i];
        let curr = face.halfEdge
        do
        {
            set.add(curr.vertex)
            curr = curr.next
        } while (curr !== face.halfEdge)
    }

    const verts = [... set]

    const relaxCount = 0|(faces.length * 100)
    for (let i=0; i < relaxCount; i++)
    {
        const v = verts[0|Math.random() * verts.length]

        setToAverage(v)
    }
    

    console.log(faces.length, ", verts =", set.size)

}


function pDistance(x, y, x1, y1, x2, y2) {

    var A = x - x1;
    var B = y - y1;
    var C = x2 - x1;
    var D = y2 - y1;

    var dot = A * C + B * D;
    var len_sq = C * C + D * D;
    var param = -1;
    if (len_sq != 0) //in case of 0 length line
        param = dot / len_sq;

    var xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    }
    else if (param > 1) {
        xx = x2;
        yy = y2;
    }
    else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    var dx = x - xx;
    var dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function renderCircle(face, palette, faceCentroid, isBig)
{
    const [x0,y0] = faceCentroid

    const { width, height} = config;

    const cx = width/2;
    const cy = height/2;

    let min = Infinity
    let curr = face.halfEdge;
    do
    {
        const dist = pDistance(
            x0,y0,
            curr.vertex.x,curr.vertex.y,
            curr.next.vertex.x,curr.next.vertex.y,
        );

        if (dist < min)
        {
            min = dist
        }
        curr = curr.next
    } while (curr !== face.halfEdge)

    const radius = min * (isBig ? 1 : 0.1 + 0.9 * Math.random())
    // let sum = 0
    // let count = 0
    // let curr = face.halfEdge;
    // do
    // {
    //     const dist = pDistance(
    //         x0,y0,
    //         curr.vertex.x,curr.vertex.y,
    //         curr.next.vertex.x,curr.next.vertex.y,
    //     );
    //
    //     sum += dist
    //     count++
    //
    //     curr = curr.next
    // } while (curr !== face.halfEdge)
    //
    // const radius = sum/count

    const length = face.length;

    const fill = length === 4 && Math.random() < 0.3;
    if (fill)
    {
        ctx.fillStyle = palette[0 | Math.random() * palette.length]
    }
    else
    {
        ctx.strokeStyle = palette[0 | Math.random() * palette.length]
    }

    ctx.beginPath();
    ctx.moveTo(cx + x0 + radius,cy + y0)
    ctx.arc(cx + x0, cy + y0,radius,0,TAU, true)
    ctx.stroke()

    if (fill)
    {
        ctx.fill()
    }
    else
    {
        ctx.stroke()
    }


    return radius

}

const black = new Color(0,0,0)

function darkest(palette)
{
    let min = Infinity;
    let best;
    for (let i = 0; i < palette.length; i++)
    {
        const color = palette[i];

        const lum = getLuminance(color)
        if (lum < min)
        {
            min = lum
            best = color
        }
    }

    console.log("DARKEST", min)
    if (min > 5000)
    {
        const darkened = Color.from(best).mix(black, 0.85).toRGBHex();
        console.log("darken", darkened)
        return darkened
    }

    return best;
}


const randomLabel = weightedRandom([
    1, "Happy",
    0.5, "New",
    0.5, "Year",
    1, "2022",
    1, null
])


domready(
    () => {

        canvas = document.getElementById("screen");
        ctx = canvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;


        const paint = () => {

            deleteAllHexagons()

            const palettes = colors();
            const palette = palettes[0 | Math.random() * palettes.length]

            ctx.fillStyle = darkest(palette);
            ctx.fillRect(0, 0, width, height);

            let faces = [];
            const verts = []

            const size = Math.ceil(width / (Math.sqrt(3) * hexagonScale));
            const hSize = 0 | (size * 0.51)

            for (let q = -hSize; q <= hSize; q++)
            {
                for (let r = -hSize; r <= hSize; r++)
                {
                    createHexagon(q, r, faces, verts)
                }
            }

            const edges = [...findInsideEdges(faces)]
            shuffle(edges)

            const count = 0 | (edges.length * 0.05)
            for (let i = 0; i < count; i++)
            {
                const edge = edges[i];
                removeEdge(faces, edge)
            }

            faces = divideIntoQuads(faces)
            faces.forEach(validateFace)
            relax(faces)

            //
            console.log("FACES", faces.length, faces.map(f => f.length))
            // console.log("VERTS", verts.map(v => (v.x|0) + "/" + (v.y|0)))
            // console.log("EDGES", edges)

            //divideIntoQuads(faces)

            const cx = width/2
            const cy = height/2


            faces.forEach(face => {
                ctx.strokeStyle = "#f0f"
                ctx.fillStyle = "#0f0"
                //            renderDebugFace(face, true, false)
                ctx.strokeStyle = "#f0f"

                const faceCentroid = centroid(face)
                const isBig = face.length === 8;

                let radius
                if (isBig)
                {
                    radius = renderCircle(face, palette, faceCentroid, isBig)
                }
                else {

                    const n = Math.random()
                    if (n < 0.55)
                    {
                        radius = renderCircle(face, palette, faceCentroid, isBig)
                    }
                    else if (n > 0.85)
                    {
                        ctx.fillStyle = palette[0 | Math.random() * palette.length]
                        ctx.beginPath();

                        let curr = face.halfEdge
                        let x0 = curr.vertex.x;
                        let y0 = curr.vertex.y;

                        const particleSize = 0.5 + Math.random() * 0.3

                        x0 = x0 + (faceCentroid[0] - x0) * particleSize
                        y0 = y0 + (faceCentroid[1] - y0) * particleSize

                        ctx.moveTo(cx + x0,  cy + y0)
                        do
                        {
                            let x0 = 0 | (curr.vertex.x);
                            let y0 = 0 | (curr.vertex.y);
                            x0 = x0 + (faceCentroid[0] - x0) * particleSize
                            y0 = y0 + (faceCentroid[1] - y0) * particleSize
                            ctx.lineTo(cx + x0,  cy + y0)

                            curr = curr.next
                        } while (curr !== face.halfEdge)
                        ctx.fill()

                    }
                }

                if (isBig)
                {
                    const label = randomLabel()
                    if (label)
                    {
                        /**
                         *
                         * @type {TextMetrics}
                         */
                        ctx.font = Math.round(radius * 0.4) + "px Lato,-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Segoe UI Symbol\""
                        const textMetrics = ctx.measureText(label);

                        ctx.fillStyle = palette[0 | Math.random() * palette.length]

                        ctx.fillText(label, width/2 + faceCentroid[0] - textMetrics.width/2,  height/2 + faceCentroid[1] + width * 0.003);
                    }
                }

            })
        };

        paint();

        window.addEventListener("click", paint, true)

    }
);

export default {
}
