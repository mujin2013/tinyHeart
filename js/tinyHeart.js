/*---------------------------基本数据----------------------------------*/
var can1=document.getElementById('canvas1');//fishes,text,dust,circle
var can2=document.getElementById('canvas2');//background,ane,fruit
var startBtn=document.getElementById('startGame');
var ctx1=can1.getContext('2d');
var ctx2=can2.getContext('2d');
var lastTime=0;//上一帧的执行时间
var deltaTime=0;//两帧的间隔时间
var canWidth=can1.width;//canvas的宽
var canHeight=can1.height;//canvas的高
var mx=canWidth*0.1;//初始化鼠标在canvas上滑动时的x值
var my=canHeight*0.8;//初始化鼠标在canvas上滑动时的y值
var textAlpha=0;


/*---------------------------定义3种状态----------------------------*/
const START=1;
const RUNNING=2;
const GAMEOVER=3;

var state=START;//定义游戏的当前状态

/*-----------------------------各种图片的创建------------------------*/
//背景--海洋
var bg=new Image();
bg.src="./images/background.jpg";

//漂浮物
var dustImg=[];//用来保存与漂浮物相关的图片
for(var i=0;i<7;i++){
	dustImg[i]=new Image();
	dustImg[i].src='./images/dust'+i+'.png';
}

//大鱼
var momEye=[];//用来大鱼的眼睛
var momOrgBody=[];//用来大鱼橙色的身体
var momBlueBody=[];//用来大鱼蓝色的身体
var momTail=[];//用来大鱼的尾巴
for(var i=0;i<2;i++){
	momEye[i]=new Image();
	momEye[i].src='./images/bigEye'+i+'.png';
}
for(var i=0;i<8;i++){
	momOrgBody[i]=new Image();
	momOrgBody[i].src='./images/bigSwim'+i+'.png';
	momBlueBody[i]=new Image();
	momBlueBody[i].src='./images/bigSwimBlue'+i+'.png';
	momTail[i]=new Image();
	momTail[i].src='./images/bigTail'+i+'.png';
}

//小鱼
var babyEye=[];//存放小鱼眼睛图片
var babyBody=[];//存放小鱼身体图片
var babyTail=[];//存放小鱼尾巴图片
for(var i=0;i<2;i++){
	babyEye[i]=new Image();
	babyEye[i].src='./images/babyEye'+i+'.png';
}
for(var i=0;i<20;i++){
	babyBody[i]=new Image();
	babyBody[i].src='./images/babyFade'+i+'.png';
}
for(var i=0;i<8;i++){
	babyTail[i]=new Image();
	babyTail[i].src='./images/babyTail'+i+'.png';
}

//果实
var orgFruit=new Image();//橙色果实
orgFruit.src='./images/fruit.png';
var blueFruit=new Image();//橙色果实
blueFruit.src='./images/blue.png';

/*-------------------------------数据对象----------------------------*/
//海洋
var SEA={image:bg,width:canWidth,height:canHeight};
//漂浮物
var DUST={image:dustImg,num:35};
//海葵
var ANE={num:50};
//mom
var MOM={momEye:momEye,momOrgBody:momOrgBody,momBlueBody:momBlueBody,momTail:momTail};
//baby
var BABY={babyEye:babyEye,babyBody:babyBody,babyTail:babyTail};
//果实
var FRUIT={orgFruit:orgFruit,blueFruit:blueFruit,num:30};
//白色涟漪
var WHITEWAVE={num:15,colorArr:[255,255,255],shaColor:'#FFF',shaBlur:8,alpha:1,maxR:50};
//橙色涟漪
var ORGWAVE={num:15,colorArr:[203,91,0],shaColor:'rgba(203,91,0,1)',shaBlur:8,alpha:1,maxR:40};
//分数
var DATA={baseScore:10};

/*----------------------------------业务对象------------------------*/
//数据（用来统计游戏得分）
function Data(config){
	this.baseScore=config.baseScore;
	this.eatFruitNum=0;//记录大鱼吃到的果实数量
	this.double=1;//用于判断吃到果实的类型，从而确定分数是否加倍
	this.score=0;//用于记录当前游戏得分
	this.historyScore=0;//游戏的历史最高分

	this.draw=function(ctx){
		//用来将分数显示到画布上
		ctx.save();
		ctx.font='30px Verdana';
		ctx.textAlign='center';//设置字的居中方式
		ctx.textBaseline='hanging';//设置字的基线对齐方式
		var gradient=ctx.createLinearGradient(canWidth*0.3,0,canWidth*0.7,30);//创建线性渐变对象
		gradient.addColorStop(0,'#FFFF00');
		gradient.addColorStop(1,'#33CC33');
		ctx.fillStyle=gradient;
		ctx.fillText('score：'+this.score,canWidth*0.5,canHeight*0.03);
		ctx.restore();
	};
	this.upScore=function(){
		//用于更新分数
		this.score+=this.eatFruitNum*this.baseScore*this.double;
		//更新完分数后，恢复默认值，用于进行下一次分数的统计
		this.eatFruitNum=0;
		this.double=1;
	};
	this.saveScore=function(){
		//将当前的得分保存
		var pervScore=localStorage.getItem('historyScore');
		var type=typeof pervScore;
		if(type=='object'){
			localStorage.setItem('historyScore',this.score);//localStorage中还没有存储过历史得分
		}else{
			parseInt(pervScore) < parseInt(this.score) ? localStorage.setItem('historyScore',this.score):localStorage.setItem('historyScore',pervScore);//此处用parseInt()将字符串转为number，保证比较不会出错
		}
	}
}
//涟漪
function Wave(config){
	this.num=config.num;
	this.shaColor=config.shaColor;//涟漪阴影颜色
	this.shaBlur=config.shaBlur;//涟漪模糊度
	this.colorArr=config.colorArr;//存涟漪颜色的那三个数值
	this.alpha=config.alpha;//存涟漪颜色的透明度
	this.maxR=config.maxR;//涟漪的最大半径
	this.x=[];//因为采用了“物体池”这个方法，所以有很多涟漪，每个涟漪都有自己的x,y，故需要用数组
	this.y=[];
	this.alive=[];//采用“物体池”，故需要进行生命判断
	this.size=[];//涟漪需要随时间变大，故需要存储每个涟漪的当前尺寸


	this.init=function(){
		//初始化每个涟漪的状态
		for(var i=0;i<this.num;i++){
			this.alive[i]=false;//初始化每个涟漪都处于休眠状态
		}
	};
	this.draw=function(ctx){
		//遍历“物体池”中的所有涟漪，找到符合条件的并绘制
		ctx.save();
		ctx.lineWidth=2;
		ctx.shadowColor=this.shaColor;
		ctx.shadowBlur=this.shaBlur;
		for(var i=0;i<this.num;i++){
			if(this.alive[i]){
				//当第i个涟漪“活着”的时候，就可以执行任务（即被绘制）
				this.size[i]+=deltaTime*0.06;
				if(this.size[i]>this.maxR){
					this.size[i]=this.maxR;
					this.alive[i]=false;//当涟漪的尺寸大于某一特定值时，该涟漪就死亡
					break;
				}
			
				ctx.beginPath();
				this.alpha=1-this.size[i]/60;//随着涟漪半径的扩大，涟漪的透明度在逐渐减小
				ctx.strokeStyle='rgba('+this.colorArr[0]+','+this.colorArr[1]+','+this.colorArr[2]+','+this.alpha+')';
				ctx.arc(this.x[i],this.y[i],this.size[i],0,Math.PI*2,false);//顺时针画一个圆形路经
				ctx.stroke();//将路径画到画布上
				ctx.closePath();	
			}
		}
		ctx.restore();
	};
	this.bornWhite=function(k){
		//产生白色涟漪
		for(var i=0;i<this.num;i++){
			if(!this.alive[i]){
				//当第i个涟漪处于休眠状态，那么它就可以执行任务
				this.alive[i]=true;//当第i个涟漪可以执行任务，就将它改为“活着”状态
				this.size[i]=0;
				this.x[i]=fruit.x[k];
				this.y[i]=fruit.y[k];
				break;
			}
		}
	};
	this.bornOrg=function(){
		//产生橙色涟漪
		for(var i=0;i<this.num;i++){
			if(!this.alive[i]){
				this.alive[i]=true;
				this.size[i]=0;
				this.x[i]=baby.x;
				this.y[i]=baby.y;
				break;
			}
		}
	};

}
//果实
function Fruit(config){
	this.orgFruit=config.orgFruit;
	this.blueFruit=config.blueFruit;
	this.num=config.num;//初始化果实的数量
	this.x=[];//每个果实的x值
	this.y=[];//每个果实的y值
	this.alive=[];//用于判断每个果实是否活着，若活着才能被画（即执行任务）
	this.fruitType=[];//用于确定果实的类型
	this.aneId=[];//用来确定每颗果实将来长在哪一株海葵上
	this.spd=[];//每个果实成长和向上浮动的速度
	this.size=[];//每个果实的大小

	this.init=function(){
		for(var i=0;i<this.num;i++){
			this.alive[i]=false;//初始化每个果实都死了
			this.fruitType[i]='';
			this.aneId[i]=0;
			this.spd[i]=Math.random()*0.017+0.003;//初始化每颗果实成长和向上浮动的速度
			//this.amp[i]=Math.random()*40+70;//指定每一颗海葵摆动的幅度
		}
		
	};
	this.draw=function(ctx){	
		for(var i=0;i<this.num;i++){
			//当该果实活着才可以执行任务
			if(this.fruitType[i]=='blue'){
				//绘制蓝色果实
				var pic=this.blueFruit;
			}else{
				//绘制黄色果实
				var pic=this.orgFruit;
			}
			if(this.alive[i]){
				//根据果实的尺寸来判断当前果实处于成长阶段还是漂浮阶段
				if(this.size[i]<18){
					//当果实处于成长阶段
					var aneID=this.aneId[i];//当前果实将要生长在的海葵的坐标
					this.x[i]=ane.headx[aneID];
					this.y[i]=ane.heady[aneID];

					this.size[i]+=this.spd[i]+0.03;
				}else{
					this.y[i]-=this.spd[i]*2*deltaTime;
				}
				ctx.drawImage(pic,this.x[i]-this.size[i]*0.5,this.y[i],this.size[i],this.size[i]);
				if(this.y[i]<-6){
					//当果实飘出边界时则消失
					this.alive[i]=false;
				}
			}
		}
	};
	this.born=function(i){
		//主要是确定每个果实将出生在哪株海葵上
		var aneID=Math.floor(Math.random()*ane.num);//得到一个随机的下标
		this.alive[i]=true;//一旦该果实被重生，它就可以执行任务
		this.size[i]=0;//指定第i个果实出生时的大小
		this.aneId[i]=aneID;//第i颗果实将来要长在下标为aneId的那株海葵上(在果实出生时告诉他会长在哪株海葵上)
		var randomFruit=Math.random();//用于产生不同种类的果实(此值为：[0,1)之间的一个数)
			if(randomFruit<0.2){
				//产生蓝色果实
				this.fruitType[i]='blue';
			}else{
				//产生黄色果实
				this.fruitType[i]='orange';
			}
	};
	this.dead=function(i){
		//第i颗果实死亡
		this.alive[i]=false;
	};
	this.sendFruit=function(){
		//产生新的果实
		for(var i=0;i<this.num;i++){
			if(!this.alive[i]){
				//第i颗果实若在休眠状态，就可以出生
				this.born(i);
				return;//一旦找到新的果实出生，就不再找新的果实
			}
		}
	};
	this.monitorFruit=function(){
		var number=0;//用于记录当前活着的果实数量
		for(var i=0;i<this.num;i++){
			if(this.alive[i]){
				number++;
			}
		}
		if(number<15){
			//当活着的果实个数低于20个的话，产生新果实
			this.sendFruit();
			return;
		}
	}
}
//小鱼
function Baby(config){
	this.babyEye=config.babyEye;
	this.babyBody=config.babyBody;
	this.babyTail=config.babyTail;
	//初始化小鱼的位置
	this.x=canWidth*0.2;
	this.y=canHeight*0.8-50;
	this.angle=0;//初始化小鱼的当前角度为0

	this.babyTailTimer=0;//用于确定多长时间播放下一张图片
	this.babyTailCount=0;//要播放图片的下标

	this.babyEyeTimer=0;
	this.babyEyeCount=0;
	this.babyEyeInterval=1000;//初始化1000ms以后播放下一张图片（用来确定多长时间以后切换到下一张图片）

	this.babyBodyTimer=0;//用于累计时间来确定多长时间以后播放下一张小鱼身体图片
	this.babyBodyCount=0;

	this.draw=function(ctx){
		ctx.save();
		if(state==RUNNING){
			//lerp x,y(根据大鱼的当前位置，更新小鱼的当前位置)
			this.x=lerpDis(mom.x,this.x,0.017);
			this.y=lerpDis(mom.y,this.y,0.017);

			//lerp angle(让小鱼始终朝向大鱼)
			var deltaY=mom.y-this.y;//大鱼和小鱼的y值之差，为算角度做准备
			var deltaX=mom.x-this.x;
			var aimAngle=Math.atan2(deltaY,deltaX)+Math.PI;//算角度值
			this.angle=lerpAngle(aimAngle,this.angle,0.8);
		}
		ctx.translate(this.x,this.y);//重新映射canvas的原点位置
		ctx.rotate(this.angle);//旋转画布

		//tail count
		this.babyTailTimer+=deltaTime;
		if(this.babyTailTimer>50){
			//当时间达到50ms后，切换到下一张图片
			this.babyTailCount=(this.babyTailCount+1)%8;
			this.babyTailTimer=0;//此句必不可少（用于为下一次计时做准备）
		}

		//eye count
		this.babyEyeTimer+=deltaTime;
		if(this.babyEyeTimer>this.babyEyeInterval){
			//当达到某一时间值后，根据当前显示的是哪张图片，决定过多久以后，播放下一张图片
			this.babyEyeCount=(this.babyEyeCount+1)%2;
			if(this.babyEyeCount==0){
				//当前显示的是“睁眼”的那张图片
				this.babyEyeInterval=Math.random()*1500+2000;//为了使鱼眼睛“睁”，“闭”的有规律，故采用随机数
			}else{
				//当前显示的是“闭眼”的那张图片
				this.babyEyeInterval=200;
			}
				this.babyEyeTimer=0;//计时器清0，为下一次计时做准备
		}
		if(state==RUNNING){
			//body count
			this.babyBodyTimer+=deltaTime;
			if(this.babyBodyTimer>300){
				this.babyBodyCount++;
				if(this.babyBodyCount>=19){
					//当小鱼身体图片轮播完以后，游戏结束
					this.babyBodyCount=19;//让小鱼显示白色身体（即小鱼死亡）
					data.historyScore=data.score;//保存当前的得分为最高历史得分
					data.saveScore();//用localStorage将当前的得分保存
					showMyScore();//显示我的成绩
					state=GAMEOVER;
				}
				this.babyBodyTimer=0;//计时器清零，用于下一次计算
			}	
		}
		
		
		
		var babyTailCount=this.babyTailCount;
		ctx.drawImage(this.babyTail[babyTailCount],-this.babyTail[babyTailCount].width*0.5+25,-this.babyTail[babyTailCount].height*0.5);
		var babyBodyCount=this.babyBodyCount;
		ctx.drawImage(this.babyBody[babyBodyCount],-this.babyBody[babyBodyCount].width*0.5,-this.babyBody[babyBodyCount].height*0.5);
		var babyEyeCount=this.babyEyeCount;
		ctx.drawImage(this.babyEye[babyEyeCount],-this.babyEye[babyEyeCount].width*0.5,-this.babyEye[babyEyeCount].height*0.5);
		ctx.restore();
	}

}
//大鱼
function Mom(config){
	this.momEye=config.momEye;
	this.momOrgBody=config.momOrgBody;
	this.momBlueBody=config.momBlueBody;
	this.momTail=config.momTail;

	this.momTailTimer=0;//用于判断多长时间显示下一张尾巴图片
	this.momTailCount=0;//用于记录尾巴图片的下标

	this.momEyeTimer=0;//用于判断多长时间显示下一张眼睛图片
	this.momEyeCount=0;//用于记录尾巴图片的下标
	this.momEyeInterval=1000;//因为鱼眨眼睛是随机的，且睁眼闭眼时间不同，故需要这个确定多长时间播放下一张图片

	this.momBodyCount=0;//用于记录大鱼当前身体图片下标

	this.x=canWidth*0.1;//初始化大鱼的x位置
	this.y=canHeight*0.8;//初始化大鱼的y位置
	this.type='orange';//初始化大鱼的身体为橙色
	this.angle=0;//大鱼所在的角度值
	
	this.draw=function(ctx){
		ctx.save();//因为要重新映射画布圆点的位置和旋转画布，故需要先保存画布的当前状态
		if(state==RUNNING){
			//lerp x,y(更新鱼的当前位置)
			this.y=lerpDis(my,this.y,0.019);
			this.x=lerpDis(mx,this.x,0.019);
		
			//lerp angle(更新鱼的当前角度值)
			var deltaY=my-this.y;//鼠标所在位置的y值与大鱼所在的位置的y值之差
			var deltaX=mx-this.x;//鼠标所在位置的x值与大鱼所在的位置的x值之差
			var aimAngle=Math.atan2(deltaY,deltaX)+Math.PI;//当前值（被趋近于点）的角度值（极坐标系下），用反正切函数算得
			this.angle=lerpAngle(aimAngle,this.angle,0.80);//更新大鱼的当前角值
		}
		ctx.translate(this.x,this.y);//将画布的原点位置重新映射到(this.x,this.y)处
		ctx.rotate(this.angle);//旋转画布

		//tail count
		this.momTailTimer+=deltaTime;
		if(this.momTailTimer>50){
			this.momTailCount=(this.momTailCount+1)%8;
			this.momTailTimer=0;
		}

		//eye count
		this.momEyeTimer+=deltaTime;
		if(this.momEyeTimer>this.momEyeInterval){
			this.momEyeCount=(this.momEyeCount+1)%2;
			if(this.momEyeCount==0){
				//当当前是睁眼图片的话
				this.momEyeInterval=Math.random()*1500+2000;
			}else{
				//当当前是闭眼图片的话
				this.momEyeInterval=200;
			}
			this.momEyeTimer=0;
		}
		
		
		var tailCount=this.momTailCount;
		ctx.drawImage(this.momTail[tailCount],-this.momTail[tailCount].width*0.5+30,-this.momTail[tailCount].height*0.5);
		var bodyCount=this.momBodyCount;
		//根据大鱼吃到果实的颜色，来改变大鱼身体的颜色
		if(data.double==1){
			//吃到的是橙色果实
			var pic=this.momOrgBody[bodyCount];
		}else{
			//吃到是蓝色果实
			var pic=this.momBlueBody[bodyCount];
		}
		ctx.drawImage(pic,-pic.width*0.5,-pic.height*0.5);
		var eyeCount=this.momEyeCount;
		ctx.drawImage(this.momEye[eyeCount],-this.momEye[eyeCount].width*0.5,-this.momEye[eyeCount].height*0.5);
		ctx.restore();
	}
}
//海葵
function Ane(config){
	this.num=config.num;//海葵的数量
	//此处采用二次贝塞尔曲线画海葵，故需要涉及三点：即 start point,control point,end point
	this.rootx=[];
	this.rooty=canHeight;//每株海葵的根的y坐标相同
	this.headx=[];
	this.heady=[];
	this.alpha=0;//海葵摆动角度的初值
	this.amp=[];//海葵摆动的幅度

	this.init=function(){
		for(var i=0;i<this.num;i++){
			this.rootx[i]=Math.random()*30+i*16;
			this.amp[i]=Math.random()*40+70;//初始化每株海葵摆动的幅度
			this.headx[i]=this.rootx[i];//初始化每株海葵的结束x值
			this.heady[i]=canHeight-250+Math.random()*50;//初始化每株海葵的结束y值
		}
	};
	this.draw=function(ctx){
		this.alpha+=deltaTime*0.0008;//海葵摆动的角度值随时间变化
		var l=Math.sin(this.alpha);//使得海葵可以左右摆动
		// 开始画海葵
		ctx.save();//保存画布的当前状态
		ctx.globalAlpha=0.6;
		ctx.lineWidth=20;
		ctx.lineCap="round";
		for(var i=0;i<this.num;i++){
			var gradient=ctx.createLinearGradient(this.rootx[i],canHeight,this.headx[i]+l*this.amp[i],this.heady[i]);//创建渐变对象
			gradient.addColorStop(0,'#003300');//设置颜色断点值
			gradient.addColorStop(0.3,'#336600');
			gradient.addColorStop(0.6,'#339933');
			gradient.addColorStop(0.8,'#99CC33');
			gradient.addColorStop(1,'#00CC00');
			ctx.strokeStyle=gradient;//使线条的颜色为渐变色
			ctx.beginPath();
			ctx.moveTo(this.rootx[i],this.rooty);//将笔触移动到海葵生长的位置
			this.headx[i]=this.rootx[i]+l*this.amp[i];//当前海葵头部的具体位置(若想让果实跟着头部一起动，这句必不可少)
			ctx.quadraticCurveTo(this.rootx[i],canHeight-150,this.headx[i],this.heady[i]);//画二次贝塞尔路径
			ctx.stroke();
			ctx.closePath();
		}
		ctx.restore();//恢复画布到最近保存的那个状态
	};
}
//漂浮物
function Dust(config){
	this.image=config.image;//有关漂浮物的全部图片
	this.num=config.num;//物体池中漂浮物的总个数
	this.x=[];//漂浮物的x坐标
	this.y=[];//漂浮物的y坐标
	this.index=[];//确定当前漂浮物的图片下标
	this.amp=[];//确定当前漂浮物摆动的幅度
	this.alpha=0;//确定当前漂浮物随海水摆动的角度

	this.init=function(){
		for(var i=0;i<this.num;i++){
			this.x[i]=Math.random()*canWidth;//第i个漂浮物的x坐标
			this.y[i]=Math.random()*canHeight;//第i个漂浮物的y坐标
			this.index[i]=Math.floor(Math.random()*7);
			this.amp[i]=Math.random()*15+30;//第i个漂浮物摆动的幅度
		}
	};
	this.draw=function(ctx){
		this.alpha+=deltaTime*0.0008;//注意这个角度需要和海葵摆动的角度相同
		var l=Math.sin(this.alpha);
		var dustImg=this.image;
		for(var i=0;i<this.num;i++){
			var curImgIndex=this.index[i];
			ctx.drawImage(dustImg[curImgIndex],this.x[i]+l*this.amp[i],this.y[i]);
		}
	};
}
//海洋
function Sea(config){
	this.image=config.image;
	this.width=config.width;
	this.height=config.height;
	this.x=0;
	this.y=0;

	this.draw=function(ctx){
		ctx.drawImage(this.image,this.x,this.y,this.width,this.height);
	};
}

/*----------------------------功能性函数------------------------------------------*/
//获取鼠标的位置
function getMousePos(e){
	if(state!=GAMEOVER){
		if(e.offsetX||e.layerX){
			mx=e.offsetX ? e.offsetX : e.layerX;
			my=e.offsetY ? e.offsetY : e.layerY;
		}
	}
}	

//显示或隐藏游戏规则介绍
function toggleRules(){
	var ruleBox=document.getElementById('gameRules');
	if(ruleBox.className!='showRules'){
		 ruleBox.className='showRules';
	}else{
		ruleBox.className='hideRules';
		state=RUNNING;//当“游戏规则”消失时，进入游戏界面
	}
}

//让一个角度值趋向于另一个角度值
//aimAngle:目标值的角度（将被趋近的那个值）
//curAngle:当前值
//rate:表示趋近程度，是一个百分比的值
function lerpAngle(aimAngle,curAngle,rate){
	var gapAngle=curAngle-aimAngle;
	if(gapAngle>Math.PI){
		gapAngle=gapAngle-2*Math.PI;
	}
	if(gapAngle<-Math.PI){
		gapAngle=gapAngle+2*Math.PI;
	}
	return aimAngle+gapAngle*rate;
}
//让一个数值趋向于另一个数值
function lerpDis(aim,cur,rate){
	var delta=aim-cur;
	return cur+delta*rate;
}
//计算两点之间的距离
//果实(对象1)的坐标：(x1,y1)
//大鱼(对象2)的坐标：(x2,y2)
function distance(x1,y1,x2,y2){
	return Math.pow(x1-x2,2)+Math.pow(y1-y2,2);//此处用勾股定理计算的
}
//碰撞检测
function crashTest(){
	//遍历每一颗果实，看它与大鱼之间的距离，若距离小于某值，则认为大鱼将果实吃掉了
	for(var i=0;i<fruit.num;i++){
		if(fruit.alive[i]&&state==RUNNING){
			if(distance(fruit.x[i],fruit.y[i],mom.x,mom.y)<900){
				fruit.dead(i);//一旦被大鱼吃掉，该果实就死去了
				data.eatFruitNum++;//大鱼吃到的果实数增加
				mom.momBodyCount++;//大鱼每吃到一颗果实身体颜色就会变化
				if(mom.momBodyCount>=7){
					mom.momBodyCount=7;//因为图片资源有限，故当大鱼身体图片播放到最后一张后，就不再变化
				}
				//判断大鱼吃到的果实类型
				if(fruit.fruitType[i]=='blue'){
					data.double=2;//当大鱼吃到“蓝色”果实需要做记录，用于最后的分数统计
				}
				whiteWave.bornWhite(i);//使白色涟漪出生
			}
		}	
	}
	//判断大鱼和小鱼之间的距离，若距离小于某一个值，则认为大鱼有喂小鱼果实
	if(distance(mom.x,mom.y,baby.x,baby.y)<900){
		if(data.eatFruitNum!=0&&state==RUNNING){
			//当大鱼有吃到果实时才能喂小鱼，从而产生橙色涟漪
			orgWave.bornOrg();
			mom.momBodyCount=0;//大鱼喂小鱼之后，身体就变为白色
			baby.babyBodyCount=0;//当大鱼喂小鱼之后，小鱼就恢复了生命
			data.upScore();//当大鱼喂小鱼果实后，更新分数
		}	
	}
}
//绘制GAMEOVER
function showGameOver(ctx){
	textAlpha+=deltaTime*0.0005;
	if(textAlpha>1){
		textAlpha=1;
	}
	ctx.save();
	ctx.shadowColor='#FFF';
	ctx.shadowBlur=10;
	ctx.globalAlpha=textAlpha;
	ctx.font='54px Verdana';
	ctx.textAlign='center';
	ctx.fillStyle='#FFF';
	ctx.textBaseline='bottom';
	ctx.fillText('GAMEOVER',canWidth*0.5,canHeight*0.3);
	ctx.restore();
}
//显示我的成绩
function showMyScore(){
	var stillPlay=document.getElementById('stillPlay');
	stillPlay.className='showStillPlay';
	var rePlay=document.getElementById('curScore');
	rePlay.innerHTML=data.score;
	var historyScore=document.getElementById('historyScore');
	historyScore.innerHTML=localStorage.getItem('historyScore');
}

/*-----------------------------主函数---------------------------------------------*/
var sea=new Sea(SEA);//创建并实例化海洋

var dust=new Dust(DUST);//创建并实例化漂浮物
dust.init();//初始化函数调用

var ane=new Ane(ANE);//创建并实例化海葵
ane.init();//初始化海葵

var mom=new Mom(MOM);//创建并实例化大鱼

var baby=new Baby(BABY);//创建并实例化小鱼

var fruit=new Fruit(FRUIT);//创建并实例化果实
fruit.init();
fruit.born();

var whiteWave=new Wave(WHITEWAVE);//创建并实例化白色涟漪
whiteWave.init();//初始化白色涟漪
var orgWave=new Wave(ORGWAVE);//创建并实例化橙色涟漪
orgWave.init();//初始化橙色涟漪

var data=new Data(DATA);//创建并实例化数据对象，用于分数统计和显示
var timer=setInterval(function(){
	var now=Date.now();//得到系统的当前时间
	deltaTime=now-lastTime;//得到两帧的间隔时间
	lastTime=now;//更新上一帧执行的时间
	ctx1.clearRect(0,0,canWidth,canHeight);//清空画布(否则漂浮物会有尾巴，鱼的线条也很粗)
	ctx2.clearRect(0,0,canWidth,canHeight);
	switch(state){
		case START:
			sea.draw(ctx2);
			dust.draw(ctx1);
			ane.draw(ctx2);
			mom.draw(ctx1);
			baby.draw(ctx1);
			break;
		case RUNNING:
			sea.draw(ctx2);
			dust.draw(ctx1);
			ane.draw(ctx2);
			mom.draw(ctx1);
			baby.draw(ctx1);
			fruit.monitorFruit();//监控当前界面上的果实数量
			fruit.draw(ctx2);
			crashTest();//碰撞检测（时刻查看是否有果实被吃点或者大鱼是否喂小鱼）
			whiteWave.draw(ctx1);//绘制白色涟漪
			orgWave.draw(ctx1);//绘制橙色涟漪
			data.draw(ctx1);
			break;
		case GAMEOVER:
		    sea.draw(ctx2);
			dust.draw(ctx1);
			ane.draw(ctx2);
			showGameOver(ctx1);
			showMyScore();
			mom.draw(ctx1);
			baby.draw(ctx1);
			break;
	}
},1000/100);

/*------------------------事件绑定函数-------------------------------*/
can1.onmousemove= getMousePos;
document.body.onload=toggleRules;//页面一加载就显示游戏规则
startBtn.onclick=toggleRules;//当点击“开始游戏按钮时”，游戏规则消失，进入游戏
document.getElementById('rePlay').onclick=function(){
	location.href='./tinyHeart.html';
}