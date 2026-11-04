export {};

declare global {
  interface Window {
    app?: any;
    PIXI?: any;
    Application?: any;
    Assets?: any;
    Container?: any;
    Sprite?: any;
    Graphics?: any;
    Text?: any;
    TextStyle?: any;
    Color?: any;
    Point?: any;
    Rectangle?: any;
    Circle?: any;
    Matrix?: any;
    Ticker?: any;
    CodeMirror?: any;
    google?: any;
    __googleClientId?: string;
  }
}
