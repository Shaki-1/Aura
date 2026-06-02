async function test() {
  try {
    const { getActiveWindow } = await import('get-windows');

    const window = await getActiveWindow();

    console.log(window);
  } catch (err) {
    console.error(err);
  }
}

test();
