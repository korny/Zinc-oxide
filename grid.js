DS.grid = {
  // Algorithm by Sam Hocevar, see http://gamedev.stackexchange.com/a/20753.
  // 
  // Here are the parameters of one hexagon. Its centre is in O, the largest width is 2a,
  // the height is 2b, and the length of the top edge is 2c.
  // 
  //          y ^
  //            |
  //      O*____|____
  //       /  b |   |\
  //      /     |   | \
  //     /      |   |  \
  // ---(-------+---+---)------>
  //     \     O|   c  / a      x
  //      \     |     /
  //       \____|____/
  //            |
  // 
  // This is the row/column layout, with the origin at the centre of the lower left hexagon.
  // 
  //  col 0
  //   | col 1
  //   |   | col 2
  //   |   |  |
  //   __  | __    __    __    __   
  //  /  \__/  \__/  \__/  \__/  \__
  //  \__/  \__/  \__/  \__/  \__/  \
  //  /  \__/  \__/  \__/  \__/  \__/
  //  \__/  \__/  \__/  \__/  \__/  \
  //  /  \__/  \__/  \__/  \__/  \__/_ _ line 2
  //  \__/  \__/  \__/  \__/  \__/  \ _ _ _ line 1
  //  / .\__/  \__/  \__/  \__/  \__/_ _ line 0
  //  \__/  \__/  \__/  \__/  \__/
  // 
  // static void GetHex(float x, float y, out int row, out int column)
  // {
  //   // Find out which major row and column we are on:
  //   row = (int)(y / b);
  //   column = (int)(x / (a + c));
  // 
  //   // Compute the offset into these row and column:
  //   float dy = y - (float)row * b;
  //   float dx = x - (float)column * (a + c);
  // 
  //   // Are we on the left of the hexagon edge, or on the right?
  //   if (((row ^ column) & 1) == 0)
  //       dy = b - dy;
  //   int right = dy * (a - c) < b * (dx - c) ? 1 : 0;
  // 
  //   // Now we have all the information we need, just fine-tune row and column.
  //   row += (column ^ row ^ right) & 1;
  //   column += right;
  // }
  getHexagonCoordinatesHocevar: function (size, x, y) {
    var a = size;
    var b = size * Math.SQRT3 / 2;
    var c = size / 2;
    
    // In our world, the origin of the hexagon is O*.
    x -= c;
    y -= b;
    
    // Find out which major row and column we are on:
    var row    = Math.floor(y / b);
    var column = Math.floor(x / (a + c));
    
    // Compute the offset into these row and column:
    var dy = y - row * b;
    var dx = x - column * (a + c);
    
    // Are we on the left of the hexagon edge, or on the right?
    if (((row ^ column) & 1) == 0) dy = b - dy;
    var right = dy * (a - c) < b * (dx - c) ? 1 : 0;
    
    // Now we have all the information we need, just fine-tune row and column.
    row    += (column ^ row ^ right) & 1;
    column += right;
    
    return { col: column, row: Math.floor(row / 2) };
  }
};
