export function clamp(v)
{
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

export default function centroid(face) {
    let x = 0;
    let y = 0;
    let count = 0;

    const first = face.halfEdge
    let curr = first
    do
    {
        x += curr.vertex.x;
        y += curr.vertex.y;
        curr = curr.next
        count++;

    } while (curr !== first)

    return [x / count, y / count];
}
