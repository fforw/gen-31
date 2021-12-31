export class Vertex
{
    /**
     * X coordinate
     * @type {number}
     */
    x;
    /**
     * Y coordinate
     * @type {number}
     */
    y;

    /**
     * Z coordinate
     * @type {number}
     */
    z;

    /**
     * Half-edge 
     * @type {null}
     */
    halfEdge = null;

    constructor(x, y, z, halfEdge)
    {
        this.x = x;
        this.y = y;
        this.z = z;

        this.halfEdge = halfEdge;
    }

    round()
    {
        this.x |= 0
        this.y |= 0
        this.z |= 0

        return this
    }

    toString()
    {
        return this.x + "/" + this.y + "/" + this.z  
    }


}


export class Edge
{

    /**
     * One of the two half edges of the edge.
     *
     * @type {HalfEdge}
     */
    halfEdge = null;
    constructor(halfEdge)
    {
        this.halfEdge = halfEdge;
    }

}
let faceCounter = 0;

export class Face
{
    /**
     * First half edge of the face interior, part of a closed loop back to the fist edge.
     *
     * @type {HalfEdge}
     */
    halfEdge = null;
    constructor(halfEdge)
    {
        this.halfEdge = halfEdge;
        this.id = faceCounter++;

    }
    get length()
    {
        const start = this.halfEdge;
        let curr = start;
        let count = 0;
        do
        {
            curr = curr.next
            count++;
        } while (curr !== start)
        return count;
    }


    get lastHalfEdge()
    {
        const start = this.halfEdge;
        let curr = start;
        do
        {
            curr = curr.next
        } while (curr.next !== start )
        return curr;
    }
}

let counter = 0;

/**
 * Central class of the half edge data structure
 */
export class HalfEdge
{
    /**
     * Next halfEdge in the face
     * @type {HalfEdge}
     */
    _next = null;

    /**
     * Twin halfEdge from another face
     * @type {HalfEdge}
     */
    twin = null;
    /**
     * Vertex of this half edge
     * @type {Vertex}
     */
    vertex = null;

    /**
     * The edge the half edge belongs to
     * @type {Edge}
     */
    edge = null;

    /**
     * The face the half edge belongs to
     * @type {Face}
     */
    face = null;


    constructor(next, vertex, edge, face)
    {
        this._next = next;
        this.twin = null;
        this.vertex = vertex;
        this.edge = edge;
        this.face = face;

        if (vertex && !vertex.halfEdge)
        {
            vertex.halfEdge = this;
        }

        if (edge && !edge.halfEdge)
        {
            edge.halfEdge = this;
        }

        if (face && !face.halfEdge)
        {
            face.halfEdge = this;
        }

        this.id = counter++

    }

    get next()
    {
        return this._next;
    }

    set next(next)
    {
        const { vertex } = this;

        if (vertex && next && next.vertex.x === vertex.x && next.vertex.y === vertex.y)
        {
            throw new Error("Same start and end ")
        }

        this._next = next
    }

    twinWith(other)
    {
        if (__DEV)
        {
            let { vertex : v0 } = this
            let { vertex : v1 } = this.next
            let { vertex : v2 } = other
            let { vertex : v3 } = other.next

            if (v0.x !== v3.x || v0.y !== v3.y || v1.x !== v2.x || v1.y !== v2.y)
            {
                throw new Error("Half edge coords not twinned " + this + ": " + v0 + ", " + v1 + ", " + v2 + ", " + v3)
            }
        }


        this.twin = other
        other.twin = this

        this.vertex = other.next.vertex
        other.vertex = this.next.vertex
        
        other.edge = this.edge || other.edge
    }

    get prev()
    {
        let curr = this;
        do
        {
            curr = curr.next
        } while (curr.next !== this)

        //console.log("prev of ", this, "is", curr)

        return curr;
    }

}
