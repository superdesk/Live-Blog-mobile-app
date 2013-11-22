$.fn.serializeObject = function()
{
 var o = {};
 var a = this.serializeArray();
 $.each(a, function() {
   if (o[this.name]) {
     if (!o[this.name].push) {
       o[this.name] = [o[this.name]];
     }
     o[this.name].push(this.value || '');
   } else {
     o[this.name] = this.value || '';
   }
 });
 return o;
};

Date.prototype.defaultView=function(){
  var dd=this.getDate();
  if(dd<10)dd='0'+dd;
  var mm=this.getMonth()+1;
  if(mm<10)mm='0'+mm;
  var yyyy=this.getFullYear();
  return String(dd+"."+mm+"."+yyyy)
}



