import { recognizeCanvasSymbol } from './canvas-symbol-recognition-model.mjs';
import { SYMBOL_PATHS } from './symbol-catalog.mjs';
self.onmessage=({data})=>{
  try{self.postMessage({id:data.id,result:recognizeCanvasSymbol(data.actions,SYMBOL_PATHS)});}
  catch(e){self.postMessage({id:data.id,error:String(e.message)});}
};
