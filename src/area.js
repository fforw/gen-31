import { Edge, Face, HalfEdge, Vertex } from "./geometry";


const TAU = Math.PI * 2;
const sin60 = Math.sin(TAU / 6);

//export const hexagonScale = 200;
//export const hexagonScale = 100;
export const hexagonScale = 90;
const hFactor = Math.sqrt(3);

const directions = [
    new Vertex(0,0, null),
    new Vertex(0,-1, null),
    new Vertex(sin60, -0.5, 0, null),
    new Vertex(sin60,  0.5, 0, null),
    new Vertex(0,1, null),
    new Vertex(-sin60, 0.5, 0, null),
    new Vertex(-sin60,  -0.5, 0, null),
]

const evenNeighbors = [
    [0,-1],
    [1,0],
    [0,1],
    [-1,1],
    [-1,0],
    [-1,-1]
]

const oddNeighbors = [
    [1,-1],
    [1,0],
    [1,1],
    [0,1],
    [-1,0],
    [0,-1]
]

export const hexagons = new Map()


function key(q, r)
{
    return q + "/" + r
}
export function lookupHexagonFaceIndex(q,r)
{
    return hexagons.get(key(q,r))
}

export function deleteAllHexagons()
{
    hexagons.clear()
}


export function createHexagon(q, r, faces, points)
{
    const start = faces.length;
    hexagons.set(key(q,r), start)

    const w = hFactor * hexagonScale
    const hw = w * 0.5
    const h = hexagonScale * 2

    const offX = w * q + ((r & 1) !== 0 ? hw : 0)
    const offY = h * 0.75 * r


    const verts = directions.map(d => new Vertex(
            d.x * hexagonScale + offX,
            d.y * hexagonScale + offY,
            0,
            null,
        ).round());

    const v3 = verts[0];

    let prevFace
    let firstFace;
    const last = verts.length - 1;
    for (let i = 1; i < verts.length; i++)
    {
        const v = verts[i];
        const v2 = verts[i === last ? 1 : i + 1];

        const face = new Face(null);

        if (i === 1)
        {
            firstFace = face
        }

        const he0 = new HalfEdge(null, v, null, face)
        const he1 = new HalfEdge(null, v2, null, face)
        const he2 = new HalfEdge(null, v3, null, face)

        he0.next = he1
        he1.next = he2
        he2.next = he0

        he0.edge = new Edge(he0)
        he1.edge = i === last ? firstFace.halfEdge.next.next.edge : new Edge(he1)
        he2.edge = prevFace ? prevFace.halfEdge.next.edge : new Edge(he2)

        face.halfEdge = he0
        faces.push(
            face
        )

        if (prevFace)
        {
            prevFace.halfEdge.next.twinWith(face.halfEdge.next.next)
        }

        prevFace = face
    }

    const face = faces[start]

    prevFace.halfEdge.next.twinWith(face.halfEdge.next.next)

    points.push(... verts)

    const neighbors = r & 1 ? oddNeighbors : evenNeighbors

    // connect hexagon to preexisting hexagons
    for (let i = 0; i < neighbors.length; i++)
    {
        const [qOff, rOff] = neighbors[i];

        const faceIndex = hexagons.get(key(q + qOff,r + rOff))
        if (faceIndex !== undefined)
        {
            const he0 = faces[start + i].halfEdge
            const he1 = faces[faceIndex + ((i + 3) % 6)].halfEdge

            he1.twinWith(he0)
        }
    }
}


